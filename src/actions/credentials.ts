"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ── SESSIONS ──────────────────────────────────────────────

export async function confirmSession(sessionId: string, userId: string, role: "teacher" | "learner") {
  const session = await prisma.skillSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found" };

  const updateData = role === "teacher" ? { teacherConfirm: true } : { learnerConfirm: true };

  const updated = await prisma.skillSession.update({
    where: { id: sessionId },
    data: updateData,
  });

  if (updated.teacherConfirm && updated.learnerConfirm) {
    await prisma.skillSession.update({
      where: { id: sessionId },
      data: { status: "confirmed" },
    });
  }

  revalidatePath("/");
  return { success: true };
}

export async function getUserSessions(userId: string) {
  return await prisma.skillSession.findMany({
    where: {
      OR: [{ teacherId: userId }, { learnerId: userId }],
    },
    include: {
      teacher: { select: { id: true, name: true, image: true } },
      learner: { select: { id: true, name: true, image: true } },
      credentials: true,
      feedbacks: true,
    },
    orderBy: { scheduledAt: "desc" },
  });
}

export async function markSessionCompletedIfDue(sessionId: string) {
  const session = await prisma.skillSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const sessionEnd = new Date(session.scheduledAt);
  sessionEnd.setHours(sessionEnd.getHours() + 1);

  if (session.status === "confirmed" && new Date() >= sessionEnd) {
    await prisma.skillSession.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });
  }
}

// ── CREDENTIALS ───────────────────────────────────────────

export async function getUserCredentials(userId: string) {
  return await prisma.credential.findMany({
    where: { userId },
    include: {
      session: {
        include: {
          teacher: { select: { name: true } },
          learner: { select: { name: true } },
          feedbacks: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });
}

export async function getCredentialByHash(hash: string) {
  return await prisma.credential.findUnique({
    where: { verificationHash: hash },
    include: {
      user: { select: { name: true, school: true, classYear: true } },
      session: {
        include: {
          teacher: { select: { name: true } },
          learner: { select: { name: true } },
          feedbacks: true,
        },
      },
    },
  });
}

// Issue a learner credential after feedback is submitted
export async function issueCredentialFromSession(sessionId: string) {
  const session = await prisma.skillSession.findUnique({
    where: { id: sessionId },
    include: { teacher: true, feedbacks: true },
  });
  if (!session) return { error: "Session not found" };

  const existing = await prisma.credential.findUnique({
    where: { sessionId_role: { sessionId, role: "learner" } },
  });
  if (existing) return { success: true, alreadyIssued: true };

  const learnerFeedback = session.feedbacks.find(f => f.giverId === session.learnerId);
  let proficiency = "Beginner";
  if (learnerFeedback) {
    const avg = (learnerFeedback.teachingQuality + learnerFeedback.contentQuality + learnerFeedback.overallExperience) / 3;
    if (avg >= 4.5) proficiency = "Advanced";
    else if (avg >= 3) proficiency = "Intermediate";
  }

  await prisma.credential.create({
    data: {
      userId: session.learnerId,
      sessionId,
      role: "learner",
      skill: session.skill,
      proficiency,
      teacherName: session.teacher.name || "Unknown",
      feedbackSummary: `Session completed with verified peer feedback — ${proficiency} level.`,
    },
  });

  revalidatePath("/");
  return { success: true };
}

// Issue a teaching credential to the teacher when they receive good feedback
export async function issueTeachingCredential(sessionId: string, avgScore: number) {
  if (avgScore < 3) return { success: true, skipped: true };

  const session = await prisma.skillSession.findUnique({
    where: { id: sessionId },
    include: { learner: true },
  });
  if (!session) return { error: "Session not found" };

  const existing = await prisma.credential.findUnique({
    where: { sessionId_role: { sessionId, role: "teacher" } },
  });
  if (existing) return { success: true, alreadyIssued: true };

  let proficiency = "Beginner";
  if (avgScore >= 4.5) proficiency = "Advanced";
  else if (avgScore >= 3) proficiency = "Intermediate";

  await prisma.credential.create({
    data: {
      userId: session.teacherId,
      sessionId,
      role: "teacher",
      skill: session.skill,
      proficiency,
      teacherName: session.learner.name || "A peer",
      feedbackSummary: `Recognized as a ${proficiency}-level instructor for "${session.skill}" — rated ${avgScore.toFixed(1)}★ by your student.`,
    },
  });

  revalidatePath("/");
  return { success: true };
}

// ── ACHIEVEMENTS ──────────────────────────────────────────

export async function addAchievement(data: {
  userId: string;
  title: string;
  organization: string;
  role: string;
  duration: string;
  description: string;
  skillsLearned: string[];
  category: string;
  certificateData?: string | null;
  certificateType?: string | null;
  certificateName?: string | null;
}) {
  const achievement = await prisma.achievement.create({
    data: {
      userId: data.userId,
      title: data.title,
      organization: data.organization,
      role: data.role,
      duration: data.duration,
      description: data.description,
      skillsLearned: data.skillsLearned,
      category: data.category,
      certificateData: data.certificateData || null,
      certificateType: data.certificateType || null,
      certificateName: data.certificateName || null,
      verificationStatus: data.certificateData ? "pending" : "unverified",
    },
  });
  revalidatePath("/");
  return achievement;
}

export async function getUserAchievements(userId: string) {
  return await prisma.achievement.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAchievement(id: string, data: {
  title: string;
  organization: string;
  role: string;
  duration: string;
  description: string;
  skillsLearned: string[];
  category: string;
  certificateData?: string | null;
  certificateType?: string | null;
  certificateName?: string | null;
}) {
  try {
    const updated = await prisma.achievement.update({
      where: { id },
      data: {
        title: data.title,
        organization: data.organization,
        role: data.role,
        duration: data.duration,
        description: data.description,
        skillsLearned: data.skillsLearned,
        category: data.category,
        certificateData: data.certificateData,
        certificateType: data.certificateType,
        certificateName: data.certificateName,
        verificationStatus: data.certificateData ? "pending" : "unverified",
      },
    });
    revalidatePath("/");
    return { success: true, achievement: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAchievement(id: string) {
  try {
    await prisma.achievement.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── FEEDBACK ──────────────────────────────────────────────

const FEEDBACK_FIELDS = [
  "punctuality", "teachingQuality", "contentQuality", "communication",
  "patience", "preparedness", "professionalism", "overallExperience",
] as const;

export async function submitFeedback(data: {
  sessionId: string;
  giverId: string;
  receiverId: string;
  giverRole: "teacher" | "learner";
  ratings: Record<string, number>;
  review: string;
}) {
  const existing = await prisma.feedback.findFirst({
    where: { sessionId: data.sessionId, giverId: data.giverId },
  });
  if (existing) return { error: "Feedback already submitted for this session" };

  const feedback = await prisma.feedback.create({
    data: {
      sessionId: data.sessionId,
      giverId: data.giverId,
      receiverId: data.receiverId,
      punctuality: data.ratings.punctuality,
      teachingQuality: data.ratings.teachingQuality,
      contentQuality: data.ratings.contentQuality,
      communication: data.ratings.communication,
      patience: data.ratings.patience,
      preparedness: data.ratings.preparedness,
      professionalism: data.ratings.professionalism,
      overallExperience: data.ratings.overallExperience,
      review: data.review,
    },
  });

  // Standard credits for the giver
  await prisma.creditTransaction.create({
    data: { userId: data.giverId, amount: 5, type: "earn", reason: "Feedback submitted" },
  });
  await prisma.user.update({
    where: { id: data.giverId },
    data: { credits: { increment: 5 } },
  });

  // If the learner gives feedback to the teacher
  if (data.giverRole === "learner") {
    const avgScore = FEEDBACK_FIELDS.reduce((sum, f) => sum + data.ratings[f], 0) / FEEDBACK_FIELDS.length;
    const teacherCredits = Math.round(avgScore * 5);

    await prisma.creditTransaction.create({
      data: { userId: data.receiverId, amount: teacherCredits, type: "earn", reason: `Feedback received (avg ${avgScore.toFixed(1)}★)` },
    });
    await prisma.user.update({
      where: { id: data.receiverId },
      data: { credits: { increment: teacherCredits } },
    });

    // Issue credential to the learner
    await issueCredentialFromSession(data.sessionId);

    // Issue teaching credential to the teacher
    await issueTeachingCredential(data.sessionId, avgScore);
  }

  revalidatePath("/");
  return { success: true, feedback };
}

export async function getUserFeedback(userId: string) {
  // Executed sequentially to prevent prepared statement collisions over poolers
  const received = await prisma.feedback.findMany({
    where: { receiverId: userId },
    include: {
      giver: { select: { name: true, image: true } },
      session: { select: { skill: true, scheduledAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const given = await prisma.feedback.findMany({
    where: { giverId: userId },
    include: {
      receiver: { select: { name: true, image: true } },
      session: { select: { skill: true, scheduledAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { received, given };
}

export async function getSessionFeedbackStatus(sessionId: string, userId: string) {
  const existing = await prisma.feedback.findFirst({
    where: { sessionId, giverId: userId },
  });
  return { alreadyGiven: !!existing };
}

// ── CREDITS ───────────────────────────────────────────────

export async function getUserCredits(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  const transactions = await prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return { balance: user?.credits || 0, transactions };
}

// ── PORTFOLIO STRENGTH SCORE ──────────────────────────────

export async function getPortfolioScore(userId: string) {
  // Executed sequentially to prevent prepared statement collisions over poolers
  const credentials = await prisma.credential.count({ where: { userId } });
  const achievements = await prisma.achievement.count({ where: { userId } });
  const feedbacks = await prisma.feedback.findMany({ where: { receiverId: userId } });
  const sessions = await prisma.skillSession.count({
    where: {
      OR: [{ teacherId: userId }, { learnerId: userId }],
      status: { in: ["confirmed", "completed"] },
      scheduledAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  const avgFeedback =
    feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + (
          f.punctuality + f.teachingQuality + f.contentQuality + f.communication +
          f.patience + f.preparedness + f.professionalism + f.overallExperience
        ) / 8, 0) / feedbacks.length
      : 0;

  const credScore = Math.min(credentials / 5, 1) * 40;
  const achScore = Math.min(achievements / 5, 1) * 30;
  const sessScore = Math.min(sessions / 10, 1) * 20;
  const feedScore = (Math.min(avgFeedback, 5) / 5) * 10;

  const score = Math.round(credScore + achScore + sessScore + feedScore);

  return { score, credentials, achievements, sessions, feedbackCount: feedbacks.length };
}

// ── LEADERBOARD ───────────────────────────────────────────

export async function getLeaderboard() {
  const users = await prisma.user.findMany({
    where: { isOnboarded: true },
    select: {
      id: true,
      name: true,
      school: true,
      classYear: true,
      image: true,
      credits: true,
      credentials: { select: { id: true } },
      achievements: { select: { id: true } },
      feedbackReceived: {
        select: {
          punctuality: true, teachingQuality: true, contentQuality: true,
          communication: true, patience: true, preparedness: true,
          professionalism: true, overallExperience: true,
        },
      },
      teachingSessions: { where: { status: { in: ["confirmed", "completed"] }, scheduledAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } }, select: { id: true } },
      learningSessions: { where: { status: { in: ["confirmed", "completed"] }, scheduledAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } }, select: { id: true } },
    },
  });

  const scored = users.map(u => {
    const credentials = u.credentials.length;
    const achievements = u.achievements.length;
    const sessions = u.teachingSessions.length + u.learningSessions.length;
    const feedbacks = u.feedbackReceived;
    const avgFeedback = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + (f.punctuality + f.teachingQuality + f.contentQuality + f.communication + f.patience + f.preparedness + f.professionalism + f.overallExperience) / 8, 0) / feedbacks.length
      : 0;

    const score = Math.round(
      Math.min(credentials / 5, 1) * 40 +
      Math.min(achievements / 5, 1) * 30 +
      Math.min(sessions / 10, 1) * 20 +
      (Math.min(avgFeedback, 5) / 5) * 10
    );

    return { id: u.id, name: u.name, school: u.school, classYear: u.classYear, image: u.image, credits: u.credits, score, credentials, achievements, sessions };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 20);
}