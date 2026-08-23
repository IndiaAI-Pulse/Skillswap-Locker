"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  userId: string;
  name: string;
  school: string;
  classYear: string;
  age: number;
  location: string;
  teachingMethod: string;
  preferredDays: string[];
}) {
  const session = await getServerSession();
  if (!session?.user?.email) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      name: data.name,
      school: data.school,
      classYear: data.classYear,
      age: data.age,
      location: data.location,
      teachingMethod: data.teachingMethod,
      preferredDays: data.preferredDays,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function getConnectedUsers(userId: string) {
  const sessions = await prisma.skillSession.findMany({
    where: { OR: [{ teacherId: userId }, { learnerId: userId }] },
    include: {
      teacher: { select: { id: true, name: true, skillsToTeach: true } },
      learner: { select: { id: true, name: true, skillsToLearn: true } },
    },
  });

  const connectedMap = new Map<string, any>();
  sessions.forEach((s) => {
    if (s.teacherId !== userId) connectedMap.set(s.teacherId, s.teacher);
    if (s.learnerId !== userId) connectedMap.set(s.learnerId, s.learner);
  });

  const allUsers = await prisma.user.findMany({
    where: { id: { not: userId }, isOnboarded: true },
    select: { id: true, name: true, skillsToLearn: true },
  });

  allUsers.forEach((u) => {
    if (!connectedMap.has(u.id)) connectedMap.set(u.id, u);
  });

  return Array.from(connectedMap.values());
}

export async function getUpcomingSessions(userId: string) {
  return await prisma.skillSession.findMany({
    where: {
      OR: [{ teacherId: userId }, { learnerId: userId }],
      status: { in: ["pending", "confirmed"] },
      scheduledAt: { gte: new Date() },
    },
    include: {
      teacher: { select: { name: true } },
      learner: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 3,
  });
}