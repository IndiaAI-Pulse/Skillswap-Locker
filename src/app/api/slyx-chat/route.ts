import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getPortfolioScore, getUserCredits, getUserCredentials, getUserAchievements } from "@/actions/credentials";
import { getUpcomingSessions } from "@/actions/profile";

const apiKey = process.env.GROQ_API_KEY;

const groq = new OpenAI({
  apiKey: apiKey || "",
  baseURL: "https://api.groq.com/openai/v1",
});

const parseJSON = (val: any) => {
  if (!val) return [];
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
  return val;
};

export async function POST(req: Request) {
  try {
    const { userId, message, history } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // ── Pull everything live from the database ──
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [portfolio, credits, credentials, achievements, upcomingSessions] = await Promise.all([
      getPortfolioScore(userId),
      getUserCredits(userId),
      getUserCredentials(userId),
      getUserAchievements(userId),
      getUpcomingSessions(userId),
    ]);

    const teachSkills = parseJSON(user.skillsToTeach);
    const learnSkills = parseJSON(user.skillsToLearn);
    const preferredDays = parseJSON(user.preferredDays);

    // ── Build a clean, factual snapshot ──
    const snapshot = `
USER PROFILE:
- Name: ${user.name || "Student"}
- School: ${user.school || "Not set"}
- Grade: ${user.classYear || "Not set"}
- Age: ${user.age || "Not set"}
- Location: ${user.location || "Not set"}
- Learning style: ${user.teachingMethod || "Not set"}
- Preferred days: ${preferredDays.length > 0 ? preferredDays.join(", ") : "None set"}

CREDITS:
- Current balance: ${credits.balance}
- Recent transactions: ${credits.transactions.length > 0
    ? credits.transactions.slice(0, 5).map(t => `${t.reason} (${t.type === "earn" ? "+" : "-"}${t.amount})`).join("; ")
    : "None yet"}

PORTFOLIO SCORE: ${portfolio.score}/100
- Credentials earned: ${portfolio.credentials}
- Achievements logged: ${portfolio.achievements}
- Completed sessions: ${portfolio.sessions}
- Feedback received count: ${portfolio.feedbackCount}

SKILLS TO TEACH: ${teachSkills.length > 0 ? teachSkills.map((s: any) => `${s.skill} (${s.level})`).join(", ") : "None added yet"}

SKILLS TO LEARN: ${learnSkills.length > 0 ? learnSkills.map((s: any) => `${s.skill} (${s.level})`).join(", ") : "None added yet"}

VERIFIED CREDENTIALS: ${credentials.length > 0
    ? credentials.map(c => `${c.skill} — ${c.proficiency} (${c.role === "teacher" ? "as teacher" : "as learner"})`).join("; ")
    : "None earned yet"}

ACHIEVEMENTS LOGGED: ${achievements.length > 0
    ? achievements.map(a => `${a.title} at ${a.organization}`).join("; ")
    : "None logged yet"}

UPCOMING SESSIONS: ${upcomingSessions.length > 0
    ? upcomingSessions.map((s: any) => `${s.skill} on ${new Date(s.scheduledAt).toLocaleDateString()}`).join("; ")
    : "None scheduled"}
`.trim();

    const systemContext = `You are SLYX, a warm, witty fox AI buddy inside SkillSwap Locker — a peer-to-peer skill exchange app for students.

Here is the user's REAL, LIVE data — this is ground truth, pulled directly from the database right now:

${snapshot}

RULES:
1. Only state facts that appear in the data above. Never invent credentials, achievements, scores, or skills that aren't listed.
2. If something is "None yet" / "Not set" / empty, tell the user honestly and encourage them (e.g. "You haven't added any skills to teach yet — want to add one?").
3. Keep responses SHORT — 2-4 sentences max, unless the user asks for a detailed breakdown.
4. Be warm, encouraging, a little playful — like a smart friend, not a robot. No corporate or technical jargon.
5. You can also help with general study tips, motivation, or how to use the app (booking sessions, matchmaking, feedback, credentials) even if unrelated to the data above.`;

    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemContext },
    ];

    (history || []).slice(-6).forEach((h: any) => {
      formattedMessages.push({
        role: h.role === "user" ? "user" : "assistant",
        content: h.text,
      });
    });

    formattedMessages.push({ role: "user", content: message });

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: formattedMessages,
      temperature: 0.4,
      max_tokens: 200,
    });

    const reply = response.choices[0]?.message?.content?.trim() || "Hmm, I've got nothing — try asking again?";
    return NextResponse.json({ reply });

  } catch (err: any) {
    console.error("SLYX chat error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Something went wrong" }, { status: 500 });
  }
}