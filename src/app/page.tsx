// src/app/page.tsx
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import OnboardingForm from "@/components/OnboardingForm";
import DashboardLayout from "@/components/DashboardLayout";
import { revalidatePath } from "next/cache";
import { LoginButton } from "@/components/LoginButton"; // Ek chota inline button component

export default async function Home() {
  const session = await getServerSession();

  // 1. STATE I: User logged out hai -> Render Google Access Layout
  if (!session || !session.user?.email) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-white p-4">
        <div className="w-full max-w-sm space-y-6 p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 text-center shadow-2xl backdrop-blur-md">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              SkillSwap Locker
            </h1>
            <p className="text-zinc-400 text-xs">Barter your skills, unlock your potential.</p>
          </div>
          <div className="mt-4">
            <LoginButton />
          </div>
        </div>
      </main>
    );
  }

  // Database se live updated profile content trace karo using primary authenticated key (email)
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  const handleRefresh = async () => {
    "use server";
    revalidatePath("/");
  };

  // 2. STATE II: Agar user onboarding complete nahi kiya hai
  if (!dbUser || !dbUser.isOnboarded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
        <OnboardingForm onComplete={handleRefresh} />
      </main>
    );
  }

  // 3. STATE III: User fully Onboarded hai -> Bhejo directly complete Sidebar Playground Application par!
  // CRITICAL FIX: Injected dbUser.id explicitly so Dashboard and AI Matchmaking tabs get direct context alignment.
const mappedUser = {
  id: dbUser.id,
  name: dbUser.name || "User",
  email: dbUser.email || "",
  image: dbUser.image || undefined,
  school: dbUser.school || undefined,
  classYear: dbUser.classYear || undefined,
  age: dbUser.age || undefined,
  location: dbUser.location || undefined,
  credits: dbUser.credits || 100,
  skillsToTeach: dbUser.skillsToTeach,
  skillsToLearn: dbUser.skillsToLearn,
  teachingMethod: dbUser.teachingMethod || undefined,
  preferredDays: dbUser.preferredDays || [],
};

  return <DashboardLayout user={mappedUser} />;
}