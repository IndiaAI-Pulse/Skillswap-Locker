"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function onboardUser(formData: any) {
  const session = await getServerSession();
  if (!session?.user?.email) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      school: formData.school,
      classYear: formData.classYear,
      age: parseInt(formData.age) || null,
      skillsToTeach: formData.skillsToTeach,
      skillsToLearn: formData.skillsToLearn,
      preferredDays: formData.preferredDays,
      teachingMethod: formData.teachingMethod,
      isOnboarded: true,
    },
  });

  revalidatePath("/");
  return { success: true };
}

export async function updateDashboardSkills(userId: string, updatedSkills: any[], type: "teach" | "learn") {
  const session = await getServerSession();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const updateData = type === "teach"
    ? { skillsToTeach: updatedSkills }
    : { skillsToLearn: updatedSkills };

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  revalidatePath("/");
  return { success: true };
}