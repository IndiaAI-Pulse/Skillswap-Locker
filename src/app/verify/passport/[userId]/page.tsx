import { prisma } from "@/lib/prisma";
import { getUserCredentials, getUserAchievements, getPortfolioScore } from "@/actions/credentials";

export default async function VerifyPassportPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, school: true, classYear: true, age: true, credits: true },
  });

  if (!user) {
    return (
      <main className="min-h-screen bg-[#030303] text-white flex items-center justify-center p-4">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">❌</div>
          <h1 className="text-lg font-bold">Passport Not Found</h1>
          <p className="text-xs text-zinc-500 font-mono mt-2">This verification link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  const [credentials, achievements, portfolioScore] = await Promise.all([
    getUserCredentials(userId),
    getUserAchievements(userId),
    getPortfolioScore(userId),
  ]);

  const getProficiencyColor = (p: string) => {
    if (p === "Advanced") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    if (p === "Intermediate") return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
    return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <main className="min-h-screen bg-[#030303] text-white p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-600/10 to-fuchsia-600/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-cyan-600/10 to-blue-600/5 blur-[160px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">

        {/* HEADER */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold font-mono text-emerald-300 uppercase tracking-widest">Verified Credential Passport</span>
          </div>
          <p className="text-xs text-zinc-500 font-mono">SkillSwap Locker • Public Verification Record</p>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/10 border border-purple-500/30 rounded-2xl p-6 shadow-[0_0_60px_rgba(147,51,234,0.1)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl font-black shadow-[0_0_30px_rgba(147,51,234,0.4)]">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">{user.name}</h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{user.school || "Institution"} • Grade {user.classYear || "XII"} • Age {user.age || 18}</p>
              </div>
            </div>
            <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-center min-w-[140px]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Portfolio Score</p>
              <div className={`text-4xl font-black font-mono ${getScoreColor(portfolioScore.score)}`}>{portfolioScore.score}</div>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">out of 100</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
            {[
              { label: "Credentials", value: portfolioScore.credentials, icon: "🏅" },
              { label: "Achievements", value: portfolioScore.achievements, icon: "🏆" },
              { label: "Sessions", value: portfolioScore.sessions, icon: "📚" },
              { label: "Credits", value: user.credits, icon: "⚡" },
            ].map((stat) => (
              <div key={stat.label} className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                <span className="text-lg">{stat.icon}</span>
                <div className="text-xl font-black font-mono text-white mt-1">{stat.value}</div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CREDENTIALS */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">🏅 Verified Credentials ({credentials.length})</h3>
          {credentials.length === 0 ? (
            <p className="text-xs text-zinc-600 font-mono text-center py-6">No verified credentials yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {credentials.map((cred) => (
                <div key={cred.id} className="bg-black/40 border border-purple-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-black text-white">{cred.skill}</h4>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${getProficiencyColor(cred.proficiency)}`}>{cred.proficiency}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">Taught by {cred.teacherName} • {new Date(cred.issuedAt).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2 bg-black/60 border border-emerald-500/20 rounded-lg p-2 mt-2">
                    <span className="text-emerald-400 text-[10px] font-mono font-bold">✓ VERIFIED</span>
                    <span className="text-zinc-600 text-[10px] font-mono truncate flex-1">#{cred.verificationHash.slice(0, 16)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACHIEVEMENTS */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">🏆 Achievements ({achievements.length})</h3>
          {achievements.length === 0 ? (
            <p className="text-xs text-zinc-600 font-mono text-center py-6">No achievements logged yet.</p>
          ) : (
            <div className="space-y-3">
              {achievements.map((ach) => (
                <div key={ach.id} className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{ach.title}</h4>
                      <p className="text-[11px] text-zinc-500 font-mono">{ach.organization} • {ach.role}</p>
                    </div>
                    {ach.certificateData ? (
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shrink-0">📎 Proof Attached</span>
                    ) : (
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border text-zinc-500 bg-zinc-500/10 border-zinc-500/20 shrink-0">No Document</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{ach.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-zinc-600 font-mono py-4">
          This page can be shared with institutions, employers, or scholarship committees for verification purposes.
        </div>
      </div>
    </main>
  );
}