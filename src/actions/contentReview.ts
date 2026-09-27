// Path: src/actions/contentReview.ts
"use server";

import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
});

export type ReviewIssue = {
  field: string;
  message: string;
  severity: "error" | "warning" | "suggestion";
};

export type ReviewResult = {
  status: "ready" | "needs_review" | "invalid";
  score: number;
  issues: ReviewIssue[];
  suggestions?: string[];
  passed: boolean;
};

// ── SKILL READINESS ───────────────────────────────────────
export async function reviewSkillContent(skill: string, level: string): Promise<ReviewResult> {
  const trimmed = skill.trim();

  // Basic completeness — these are facts, not AI's job
  if (!trimmed || trimmed.length < 2) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "skill", message: "Skill name is too short", severity: "error" }],
    };
  }
  if (!level) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "level", message: "Please select a level", severity: "error" }],
    };
  }

  // Garbage detection — pure pattern, no AI needed
  const isGarbage = /^[^a-zA-Z]+$/.test(trimmed) || /^(.)\1{3,}$/.test(trimmed) || trimmed.length > 80;
  if (isGarbage) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "skill", message: "This doesn't look like a valid skill name", severity: "error" }],
    };
  }

  // AI does the real semantic analysis
  try {
    const prompt = `You are a skill validator for a student peer-learning platform called SkillSwap Locker.
A student wants to add this skill to their profile:
Skill: "${trimmed}"
Level: "${level}"

Analyze this and respond ONLY with valid JSON in this exact format:
{
  "valid": true/false,
  "specific": true/false,
  "levelConsistent": true/false,
  "issues": [
    { "field": "skill", "severity": "error|warning", "message": "..." }
  ],
  "suggestions": ["alternative skill name 1", "alternative skill name 2"],
  "score": 0-100
}

Rules:
- valid: is this a real, learnable skill? (false for gibberish, nonsense, or things that cannot be taught peer-to-peer)
- specific: is the name specific enough for peer matchmaking? (false for "Coding", "Science", "Art", "Stuff", "Sports" etc — too broad)
- levelConsistent: does the level make sense? (e.g. "Advanced Python" at Basic level is inconsistent, but "Python" at any level is fine)
- issues: list only real problems. Do NOT add fake issues. If the skill is valid and specific, issues should be empty [].
- suggestions: only if not specific — suggest 2-3 more specific alternatives. Empty [] if skill is already specific.
- score: 0-100 readiness score. 100 = perfect. Deduct 40 for invalid, 25 for not specific, 15 for level inconsistency. If no issues, score is 100.
Be honest and dynamic. Do NOT hardcode responses. Analyze the actual skill name given.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 300,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : 70;
    const aiIssues: ReviewIssue[] = Array.isArray(parsed.issues) ? parsed.issues : [];
    const aiSuggestions: string[] = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const errors = aiIssues.filter((i) => i.severity === "error").length;
    const status: ReviewResult["status"] = errors > 0 ? "invalid" : aiIssues.length > 0 ? "needs_review" : "ready";

    return {
      status,
      score,
      issues: aiIssues,
      suggestions: aiSuggestions,
      passed: errors === 0,
    };
  } catch (err) {
    console.error("AI skill review failed:", err);
    // Fallback — if AI fails, allow it through with a warning
    return {
      status: "ready",
      score: 85,
      issues: [],
      suggestions: [],
      passed: true,
    };
  }
}

// ── MEET LINK READINESS ───────────────────────────────────
const MEET_PATTERN = /^https:\/\/meet\.google\.com\/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+(\?.*)?$/;
const ZOOM_PATTERN = /^https:\/\/([\w-]+\.)?zoom\.us\/j\/\d+/;
const TEAMS_PATTERN = /^https:\/\/teams\.microsoft\.com\/l\/meetup-join\//;

export async function reviewMeetLink(link: string): Promise<ReviewResult> {
  const trimmed = link.trim();

  // Empty = fine, it's optional
  if (!trimmed) {
    return { status: "ready", score: 100, issues: [], passed: true };
  }

  const issues: ReviewIssue[] = [];
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "meetLink", message: "This doesn't look like a valid URL — it should start with https://", severity: "error" }],
    };
  }

  if (url.protocol !== "https:") {
    issues.push({ field: "meetLink", message: "Link must use https://", severity: "error" });
  }

  const isGoogleMeet = url.hostname === "meet.google.com";
  const isZoom = url.hostname.includes("zoom.us");
  const isTeams = url.hostname === "teams.microsoft.com";

  if (!isGoogleMeet && !isZoom && !isTeams) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [
        {
          field: "meetLink",
          message: `"${url.hostname}" is not a supported platform — use Google Meet (meet.google.com), Zoom (zoom.us), or Microsoft Teams`,
          severity: "error",
        },
      ],
    };
  }

  if (isGoogleMeet) {
    const path = url.pathname;
    if (!path || path === "/" || path.length < 5) {
      issues.push({
        field: "meetLink",
        message: "Google Meet link is incomplete — copy the full link including the meeting code (e.g. https://meet.google.com/abc-defg-hij)",
        severity: "error",
      });
    } else if (!MEET_PATTERN.test(trimmed.split("?")[0] + (url.search ? "?" + url.search : ""))) {
      // Lenient — if path exists but doesn't match exactly, just warn
      if (path.split("/").filter(Boolean).length === 0) {
        issues.push({
          field: "meetLink",
          message: "Google Meet link appears incomplete — make sure to copy the full link from Google Meet",
          severity: "warning",
        });
      }
    }
  }

  if (isZoom && !ZOOM_PATTERN.test(trimmed)) {
    issues.push({ field: "meetLink", message: "Zoom link format looks unusual — expected: https://zoom.us/j/[meeting-id]", severity: "warning" });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 50 - warnings * 20);
  const status: ReviewResult["status"] = errors > 0 ? "invalid" : warnings > 0 ? "needs_review" : "ready";

  return { status, score, issues, passed: errors === 0 };
}

// ── SESSION READINESS ─────────────────────────────────────
export async function reviewSessionContent(data: {
  skill: string;
  learnerId: string;
  teacherId: string;
  scheduledAt: string;
  meetLink?: string;
}): Promise<ReviewResult> {
  const issues: ReviewIssue[] = [];
  const suggestions: string[] = [];

  // Field completeness
  if (!data.skill) issues.push({ field: "skill", message: "Select a skill to teach", severity: "error" });
  if (!data.learnerId) issues.push({ field: "learner", message: "Select a learner", severity: "error" });

  if (!data.scheduledAt) {
    issues.push({ field: "date", message: "Session date is required", severity: "error" });
  } else {
    const scheduled = new Date(data.scheduledAt);
    if (isNaN(scheduled.getTime())) {
      issues.push({ field: "date", message: "Invalid date format", severity: "error" });
    } else {
      if (scheduled <= new Date()) {
        issues.push({ field: "date", message: "Session must be scheduled in the future", severity: "error" });
      }
      const daysUntil = (scheduled.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntil > 60) {
        issues.push({
          field: "date",
          message: "Session is more than 60 days away — consider scheduling sooner so learners stay engaged",
          severity: "warning",
        });
      }

      // Weekly limit
      if (data.teacherId) {
        const weekStart = new Date(scheduled);
        weekStart.setDate(scheduled.getDate() - scheduled.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const count = await prisma.skillSession.count({
          where: {
            teacherId: data.teacherId,
            scheduledAt: { gte: weekStart, lt: weekEnd },
          },
        });

        if (count >= 3) {
          issues.push({
            field: "date",
            message: "You've already booked 3 sessions this week — the maximum allowed. Choose a date in a different week",
            severity: "error",
          });
        }
      }
    }
  }

  // Meet link check
  if (data.meetLink && data.meetLink.trim()) {
    const linkReview = await reviewMeetLink(data.meetLink);
    issues.push(...linkReview.issues);
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 35 - warnings * 10);
  const status: ReviewResult["status"] = errors > 0 ? "invalid" : warnings > 0 ? "needs_review" : "ready";

  return { status, score, issues, suggestions, passed: errors === 0 };
}

// ── ACHIEVEMENT READINESS ─────────────────────────────────
export async function reviewAchievementContent(data: {
  title: string;
  description: string;
  organization?: string;
  role?: string;
  skillsLearned: string[];
}): Promise<ReviewResult> {
  const title = (data.title || "").trim();
  const description = (data.description || "").trim();
  const skillsLearned = data.skillsLearned || [];

  // Basic completeness — facts, not AI's job
  if (!title || title.length < 2) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "title", message: "Achievement title is too short", severity: "error" }],
    };
  }
  if (!description || description.length < 15) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "description", message: "Description is too short — add a bit more detail about what you did", severity: "error" }],
    };
  }
  if (skillsLearned.length === 0) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "skillsLearned", message: "Add at least one skill you learned or used", severity: "error" }],
    };
  }

  // Garbage detection — pure pattern, no AI needed
  const isGarbage = /^[^a-zA-Z]+$/.test(description) || /^(.)\1{5,}$/.test(description);
  if (isGarbage) {
    return {
      status: "invalid",
      score: 0,
      passed: false,
      issues: [{ field: "description", message: "This description doesn't look like real content", severity: "error" }],
    };
  }

  // AI does the semantic analysis
  try {
    const prompt = `You are a content validator for a student peer-learning platform called SkillSwap Locker.
A student is logging an achievement to their portfolio.

Title: "${title}"
Organization/Context: "${data.organization || "Not specified"}"
Their role: "${data.role || "Not specified"}"
Description: "${description}"
Skills they claim to have learned/used: ${JSON.stringify(skillsLearned)}

Respond ONLY with valid JSON in this exact format:
{
  "plausible": true/false,
  "descriptionSubstantive": true/false,
  "skillsSupported": true/false,
  "issues": [
    { "field": "description", "severity": "error|warning", "message": "..." }
  ],
  "score": 0-100
}

Rules:
- plausible: does this read like a real achievement, not spam or nonsense?
- descriptionSubstantive: does the description actually explain what they did, not just restate the title?
- skillsSupported: do the claimed skills reasonably connect to what's described? Soft skills like "leadership", "public speaking", or "confidence" are valid even if not literally named in the description, as long as the achievement context supports them.
- issues: list only real problems. Empty [] if everything looks fine.
- score: 0-100. Deduct 40 for implausible, 25 for a thin/non-substantive description, 15 for unsupported skills. 100 if no issues.
Be honest and dynamic — do NOT hardcode responses, analyze the actual content given.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 300,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const score = typeof parsed.score === "number" ? Math.max(0, Math.min(100, parsed.score)) : 70;
    const aiIssues: ReviewIssue[] = Array.isArray(parsed.issues) ? parsed.issues : [];
    const errors = aiIssues.filter((i) => i.severity === "error").length;
    const status: ReviewResult["status"] = errors > 0 ? "invalid" : aiIssues.length > 0 ? "needs_review" : "ready";

    return {
      status,
      score,
      issues: aiIssues,
      passed: errors === 0,
    };
  } catch (err) {
    console.error("AI achievement review failed:", err);
    // Fallback — if AI fails, allow it through (consistent with reviewSkillContent's fallback behavior)
    return {
      status: "ready",
      score: 85,
      issues: [],
      passed: true,
    };
  }
}