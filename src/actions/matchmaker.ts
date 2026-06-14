"use server";

import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Initialize the OpenAI client targeting Groq's high-speed completion cloud
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const normalizeSkillString = (skillName: string | undefined | null): string => {
  if (!skillName) return "";
  return skillName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
};

export async function findSkillMatches(
  currentUserId: string,
  learnFilter?: string,
  teachFilter?: string
) {
  try {
    if (!currentUserId || currentUserId === "undefined") {
      return { matches: [], error: "Invalid user tracking token." };
    }

    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser) throw new Error("Current user profile not found.");

    const otherUsers = await prisma.user.findMany({
      where: { id: { not: currentUserId }, isOnboarded: true },
    });
    if (otherUsers.length === 0) return { matches: [] };

    const parseJSON = (val: any) => {
      if (!val) return [];
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return []; }
      }
      return val;
    };

    const myTeach = parseJSON(currentUser.skillsToTeach);
    const myLearn = parseJSON(currentUser.skillsToLearn);
    const myPreferredDays = parseJSON(currentUser.preferredDays) || [];
    const myMode = currentUser.teachingMethod || "Hybrid";
    const myCredits = currentUser.credits || 100;

    const normLearnFilter = normalizeSkillString(learnFilter);
    const normTeachFilter = normalizeSkillString(teachFilter);

    const calculatedMatches = otherUsers.map((peer) => {
      const peerTeach = parseJSON(peer.skillsToTeach);
      const peerLearn = parseJSON(peer.skillsToLearn);
      const peerPreferredDays = parseJSON(peer.preferredDays) || [];
      const peerMode = peer.teachingMethod || "Hybrid";
      const peerCredits = peer.credits || 100;

      // ── 1. SKILL INTERSECTION VELOCITY (35%) ──
      let canLearn: { skill: string; myLevel: string; theirLevel: string }[] = [];
      let canTeach: { skill: string; myLevel: string; theirLevel: string }[] = [];
      let iLearnPeerTeaches = false;
      let iTeachPeerLearns = false;

      myLearn.forEach((ml: any) => {
        const cleanMyLearnSkill = normalizeSkillString(ml.skill);
        if (!cleanMyLearnSkill) return;
        if (normLearnFilter && cleanMyLearnSkill !== normLearnFilter) return;

        peerTeach.forEach((pt: any) => {
          if (cleanMyLearnSkill === normalizeSkillString(pt.skill)) {
            iLearnPeerTeaches = true;
            if (!canLearn.some(c => c.skill === ml.skill)) {
              canLearn.push({ skill: ml.skill, myLevel: ml.level || "Basic", theirLevel: pt.level || "Basic" });
            }
          }
        });
      });

      myTeach.forEach((mt: any) => {
        const cleanMyTeachSkill = normalizeSkillString(mt.skill);
        if (!cleanMyTeachSkill) return;
        if (normTeachFilter && cleanMyTeachSkill !== normTeachFilter) return;

        peerLearn.forEach((pl: any) => {
          if (cleanMyTeachSkill === normalizeSkillString(pl.skill)) {
            iTeachPeerLearns = true;
            if (!canTeach.some(c => c.skill === mt.skill)) {
              canTeach.push({ skill: mt.skill, myLevel: mt.level || "Basic", theirLevel: pl.level || "Basic" });
            }
          }
        });
      });

      let scoreIntersection = 0;
      let intersectionType = "No Match";
      if (iLearnPeerTeaches && iTeachPeerLearns) {
        scoreIntersection = 35;
        intersectionType = "Perfect two-way match!";
      } else if (iLearnPeerTeaches || iTeachPeerLearns) {
        scoreIntersection = 18;
        intersectionType = "One-way match";
      }

      // ── 2. LEVEL DELTA CALIBRATION (20%) ──
      const levelRank: Record<string, number> = { basic: 1, beginner: 1, intermediate: 2, advance: 3, advanced: 3 };
      let scoreExpertise = 0;
      const allRelevant = [...canLearn, ...canTeach];
      if (allRelevant.length > 0) {
        const deltas = allRelevant.map(item => {
          const teacherLevel = canLearn.includes(item) ? item.theirLevel : item.myLevel;
          const learnerLevel = canLearn.includes(item) ? item.myLevel : item.theirLevel;
          const tRank = levelRank[teacherLevel?.toLowerCase()] || 1;
          const lRank = levelRank[learnerLevel?.toLowerCase()] || 1;
          const diff = tRank - lRank;
          if (diff === 0) return 20;
          if (diff > 0) return 14;
          return 6;
        });
        scoreExpertise = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
      }

      // ── 3. CHRONOLOGICAL SYNC (20%) ──
      const commonDays = myPreferredDays.filter((day: string) =>
        peerPreferredDays.some((pd: string) => pd.toLowerCase() === day.toLowerCase())
      );
      let scoreAvailability = 0;
      if (commonDays.length >= 3) scoreAvailability = 20;
      else if (commonDays.length === 2) scoreAvailability = 15;
      else if (commonDays.length === 1) scoreAvailability = 8;

      // ── 4. PEDAGOGICAL ALIGNMENT (15%) ──
      const scoreMode = myMode.toLowerCase() === peerMode.toLowerCase() ? 15 : 5;

      // ── 5. CREDIT SCORE GRAVITY (10%) ──
      const creditDiff = Math.abs(myCredits - peerCredits);
      let scoreCredits = 10;
      if (creditDiff > 150) scoreCredits = 3;
      else if (creditDiff > 50) scoreCredits = 6;

      const finalScore = Math.min(100, scoreIntersection + scoreExpertise + scoreAvailability + scoreMode + scoreCredits);

      let isViable = scoreIntersection > 0;
      if (normLearnFilter && !iLearnPeerTeaches) isViable = false;
      if (normTeachFilter && !iTeachPeerLearns) isViable = false;

      return {
        peer,
        score: finalScore,
        canLearn,
        canTeach,
        breakdown: {
          intersection: { value: scoreIntersection, max: 35, type: intersectionType },
          levelDelta: { value: scoreExpertise, max: 20 },
          chronoSync: { value: scoreAvailability, max: 20, commonDays },
          pedagogical: { value: scoreMode, max: 15, matched: scoreMode === 15, myMethod: myMode, peerMethod: peerMode },
          creditGravity: { value: scoreCredits, max: 10, peerCredits },
        },
        isViable,
      };
    })
    .filter((m) => m.isViable)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    const buildResult = (item: typeof calculatedMatches[number], analysis: string) => ({
      id: item.peer.id,
      name: item.peer.name || "Anonymous",
      school: item.peer.school || "Unknown Institution",
      classYear: item.peer.classYear || "N/A",
      age: item.peer.age || null,
      location: item.peer.location || "Remote",
      credits: item.peer.credits || 0,
      teachingMethod: item.peer.teachingMethod || "Hybrid",
      preferredDays: parseJSON(item.peer.preferredDays),
      matchScore: item.score,
      canLearn: item.canLearn,
      canTeach: item.canTeach,
      breakdown: item.breakdown,
      analysis,
    });

    if (calculatedMatches.length === 0 || !process.env.GROQ_API_KEY) {
      return {
        matches: calculatedMatches.map((m) =>
          buildResult(m, `Match score: ${m.score}%. ${m.breakdown.intersection.type} detected — skills aligned successfully.`)
        ),
      };
    }

    // Process analysis strings sequentially or concurrently via Groq
    const finalMatches = await Promise.all(
      calculatedMatches.map(async (item) => {
        const prompt = `
You are SLYX, a witty cyber fox AI inside SkillSwap Locker — a verified student credential platform.
Analyze this peer match:
- Match Score: ${item.score}%
- Skills they teach you: ${JSON.stringify(item.canLearn.map(c => c.skill))}
- Skills you teach them: ${JSON.stringify(item.canTeach.map(c => c.skill))}
- Match type: ${item.breakdown.intersection.type}
- Common available days: ${JSON.stringify(item.breakdown.chronoSync.commonDays)}
- Teaching style compatibility: ${item.breakdown.pedagogical.matched ? "Perfect" : "Partial"}

Write exactly 2 punchy lines explaining why this ${item.score}% match makes sense. Be sharp, motivating, cyber-themed. No hashtags. No invented percentages.`;

        try {
          const response = await groq.chat.completions.create({
            model: "llama3-70b-8192", // Using 70B for highly precise tone and compliance
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 100
          });
          return buildResult(item, response.choices[0]?.message?.content?.trim() || "");
        } catch (err) {
          console.error("Groq individual match analysis row error:", err);
          return buildResult(item, item.score >= 75
            ? "Boom! Strong skill vector alignment detected. This exchange has real potential."
            : "Solid match identified. Skills complement each other well.");
        }
      })
    );

    return { matches: finalMatches };
  } catch (error: any) {
    return { matches: [], error: error.message };
  }
}