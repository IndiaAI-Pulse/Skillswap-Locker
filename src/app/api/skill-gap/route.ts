import { NextResponse } from "next/server";
import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  try {
    const { skillsToTeach, skillsToLearn, credentials, sessions } = await req.json();

    const prompt = `You are SLYX, an AI skill gap analyser for a peer-to-peer student learning platform called SkillSwap Locker.

Analyse this student's profile:

SKILLS THEY TEACH: ${JSON.stringify(skillsToTeach)}
SKILLS THEY WANT TO LEARN: ${JSON.stringify(skillsToLearn)}
VERIFIED CREDENTIALS EARNED: ${JSON.stringify(credentials)}
COMPLETED SESSIONS: ${sessions}

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "2-3 sentence personalized summary of their skill profile and learning journey so far",
  "strengths": ["skill1", "skill2"],
  "gaps": [
    {
      "skill": "skill name",
      "reason": "why this is a gap for them specifically",
      "suggestion": "specific actionable suggestion to close this gap using the platform"
    }
  ],
  "nextSteps": ["step1", "step2", "step3"],
  "demandInsight": "1-2 sentences about which of their skills are in high demand and which need updating based on current industry trends"
}

Rules:
- Be specific to their actual profile, not generic
- Gaps should relate to what they want to learn but haven't earned credentials for yet, or skills complementary to what they teach
- Next steps should reference platform features (book a session, find a match, add a skill)
- Keep all text concise and motivating
- If they have no skills or sessions yet, encourage them to start
- Maximum 3 gaps, maximum 4 next steps`;

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    
    // Clean up any stray markdown wrappers before parsing
    const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("Skill gap analysis error:", err);
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 });
  }
}