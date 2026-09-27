// Path: src/app/api/demo-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidMatch } from "@/actions/matchmaker";

export async function POST(req: NextRequest) {
  try {
    const { teacherId, learnerId, skill, scheduledAt, meetLink } = await req.json();

    if (!teacherId || !learnerId || !skill || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Restriction: you can only book a session (as teacher, for a learner)
    // if the teacher actually teaches this skill AND the learner actually
    // wants to learn it — i.e. they're a genuine match on this skill.
    const matched = await isValidMatch(teacherId, learnerId, skill);
    if (!matched) {
      return NextResponse.json(
        { error: "You can only book sessions with peers you're matched with for this skill." },
        { status: 403 }
      );
    }

    const session = await prisma.skillSession.create({
      data: {
        teacherId,
        learnerId,
        skill,
        scheduledAt: new Date(scheduledAt),
        status: "pending",
        teacherConfirm: true,
        learnerConfirm: false,
        meetLink: meetLink || null,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}