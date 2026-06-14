import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { teacherId, learnerId, skill, scheduledAt, meetLink } = await req.json();

    if (!teacherId || !learnerId || !skill || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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