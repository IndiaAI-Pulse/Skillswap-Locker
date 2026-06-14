"use client";

import { useState, useEffect } from "react";
import { getUserCredentials, getUserAchievements, getPortfolioScore } from "@/actions/credentials";

interface CredentialPassportProps {
  user: { id: string; name: string; school?: string; classYear?: string; age?: number; credits: number };
}

export default function CredentialPassport({ user }: CredentialPassportProps) {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [portfolioScore, setPortfolioScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"passport" | "credentials" | "achievements">("passport");
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedAchId, setExpandedAchId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [creds, achvs, score] = await Promise.all([
        getUserCredentials(user.id),
        getUserAchievements(user.id),
        getPortfolioScore(user.id),
      ]);
      setCredentials(creds);
      setAchievements(achvs);
      setPortfolioScore(score);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyPassportLink = () => {
    const url = `${window.location.origin}/verify/passport/${user.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getProficiencyColor = (p: string) => {
    if (p === "Advanced") return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    if (p === "Intermediate") return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
    return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  };

  const getDocStatusBadge = (ach: any) => {
    if (ach.certificateData) {
      return <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">📎 Proof Attached</span>;
    }
    return <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border text-zinc-500 bg-zinc-500/10 border-zinc-500/20">No Document</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-purple-400 mt-4 animate-pulse uppercase tracking-widest">Loading Credential Passport...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">

      {/* HERO CARD */}
      <div className="relative bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/10 border border-purple-500/30 rounded-2xl p-6 shadow-[0_0_60px_rgba(147,51,234,0.1)] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl font-black shadow-[0_0_30px_rgba(147,51,234,0.4)]">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[9px] font-black font-mono tracking-widest text-purple-300 uppercase bg-purple-500/20 px-2 py-0.5 border border-purple-500/30 rounded">Credential Passport</span>
                <span className="text-[9px] font-black font-mono tracking-widest text-emerald-300 uppercase bg-emerald-500/20 px-2 py-0.5 border border-emerald-500/30 rounded">✓ Verified </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">{user.name}</h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {user.school || "Institution"} • Grade {user.classYear || "XII"} • Age {user.age || 18}
              </p>
            </div>
          </div>

          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 text-center min-w-[140px] backdrop-blur-xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Portfolio Score</p>
            <div className={`text-4xl font-black font-mono ${getScoreColor(portfolioScore?.score || 0)}`}>{portfolioScore?.score || 0}</div>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">out of 100</p>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-1000" style={{ width: `${portfolioScore?.score || 0}%` }} />
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
          {[
            { label: "Credentials", value: portfolioScore?.credentials || 0, icon: "🏅", color: "text-purple-400" },
            { label: "Achievements", value: portfolioScore?.achievements || 0, icon: "🏆", color: "text-yellow-400" },
            { label: "Sessions", value: portfolioScore?.sessions || 0, icon: "📚", color: "text-cyan-400" },
            { label: "Credits", value: user.credits || 0, icon: "⚡", color: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
              <span className="text-lg">{stat.icon}</span>
              <div className={`text-xl font-black font-mono ${stat.color} mt-1`}>{stat.value}</div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* VERIFICATION LAYER */}
      <div className="bg-gradient-to-br from-emerald-900/10 to-transparent border border-emerald-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">🔗 Share Your Achievements</h3>
          <p className="text-[11px] text-zinc-400 font-mono mt-1 max-w-md">
            Create a link you can send to colleges, employers, or scholarships — anyone can view it, no login needed.
          </p>
        </div>
        <button
          onClick={copyPassportLink}
          className="px-5 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono rounded-xl transition-all shrink-0 whitespace-nowrap"
        >
          {copiedLink ? "✓ Link Copied!" : "🔗 Copy My Link"}
        </button>
      </div>

      {/* TAB SWITCHER */}
      <div className="flex gap-2 bg-black/40 border border-white/10 rounded-xl p-1.5 w-fit">
        {[
          { id: "passport", label: "📋 Overview" },
          { id: "credentials", label: "🏅 Credentials" },
          { id: "achievements", label: "🏆 Achievements" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveView(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${activeView === tab.id ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeView === "passport" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2"><span className="text-purple-400">🦊</span> SLYX Passport Summary</h3>
            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 font-mono text-xs text-zinc-300 leading-relaxed">
              {credentials.length === 0 && achievements.length === 0 ? (
                <p className="text-zinc-500 italic">No verified credentials yet. Complete a session and give feedback to earn your first credential.</p>
              ) : (
                <p>
                  <span className="text-purple-300 font-bold">{user.name}</span> has earned{" "}
                  <span className="text-cyan-300 font-bold">{credentials.length} verified credential{credentials.length !== 1 ? "s" : ""}</span>,{" "}
                  logged <span className="text-yellow-300 font-bold">{achievements.length} achievement{achievements.length !== 1 ? "s" : ""}</span>, and completed{" "}
                  <span className="text-emerald-300 font-bold">{portfolioScore?.sessions || 0} session{portfolioScore?.sessions !== 1 ? "s" : ""}</span>.{" "}
                  Portfolio score: <span className={`font-bold ${getScoreColor(portfolioScore?.score || 0)}`}>{portfolioScore?.score || 0}/100</span>.
                </p>
              )}
            </div>
          </div>

          {credentials.length > 0 && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-zinc-200 mb-4">🏅 Recent Credentials</h3>
              <div className="space-y-3">
                {credentials.slice(0, 3).map((cred) => (
                  <div key={cred.id} className="flex items-center justify-between bg-black/40 border border-purple-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-sm">🏅</div>
                      <div>
                        <p className="text-xs font-bold text-white">{cred.skill}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Taught by {cred.teacherName} • {new Date(cred.issuedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold font-mono px-2 py-1 rounded border ${getProficiencyColor(cred.proficiency)}`}>{cred.proficiency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {credentials.length === 0 && (
            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">🏅</div>
              <h3 className="text-sm font-bold text-zinc-300 mb-2">No Credentials Yet</h3>
              <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">Complete a session, get feedback from your teacher, and your first verified credential will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* CREDENTIALS */}
      {activeView === "credentials" && (
        <div className="space-y-4">
          {credentials.length === 0 ? (
            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">🏅</div>
              <h3 className="text-sm font-bold text-zinc-300 mb-2">No Verified Credentials Yet</h3>
              <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">Complete a session and receive feedback to earn your first verified credential.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {credentials.map((cred) => (
                <div key={cred.id} className="bg-gradient-to-br from-white/[0.04] to-transparent border border-purple-500/20 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl" />
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-purple-500/30 flex items-center justify-center text-lg">🏅</div>
                      <div>
                        <h4 className="text-sm font-black text-white">{cred.skill}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono">Issued {new Date(cred.issuedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border ${getProficiencyColor(cred.proficiency)}`}>{cred.proficiency}</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400"><span>Taught by:</span><span className="text-zinc-200 font-bold">{cred.teacherName}</span></div>
                    {cred.feedbackSummary && <div className="bg-black/40 border border-white/5 rounded-lg p-2 text-zinc-400 italic text-[11px]">{cred.feedbackSummary}</div>}
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2 bg-black/60 border border-emerald-500/20 rounded-lg p-2">
                      <span className="text-emerald-400 text-[10px] font-mono font-bold">✓ VERIFIED</span>
                      <span className="text-zinc-600 text-[10px] font-mono truncate flex-1">#{cred.verificationHash.slice(0, 20)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACHIEVEMENTS */}
      {activeView === "achievements" && (
        <div className="space-y-4">
          {achievements.length === 0 ? (
            <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="text-sm font-bold text-zinc-300 mb-2">No Achievements Added Yet</h3>
              <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">Go to the Achievements tab to add competitions, leadership roles, research, volunteering and more.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {achievements.map((ach) => (
                <div key={ach.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-sm font-black text-white">{ach.title}</h4>
                      <p className="text-xs text-zinc-400 font-mono">{ach.organization} • {ach.role}</p>
                    </div>
                    {getDocStatusBadge(ach)}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{ach.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(ach.skillsLearned as string[]).map((skill, i) => (
                      <span key={i} className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-mono">{skill}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-600 font-mono">
                    <span>Duration: {ach.duration} • Added {new Date(ach.createdAt).toLocaleDateString()}</span>
                    {ach.certificateData && (
                      <button onClick={() => setExpandedAchId(expandedAchId === ach.id ? null : ach.id)} className="text-yellow-400 hover:text-yellow-300 transition-colors">
                        📎 {expandedAchId === ach.id ? "Hide" : "View"} Proof
                      </button>
                    )}
                  </div>
                  {expandedAchId === ach.id && ach.certificateData && (
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      {ach.certificateType?.startsWith("image/") ? (
                        <img src={ach.certificateData} alt="Certificate" className="w-full max-h-64 object-contain bg-black/40" />
                      ) : (
                        <div className="bg-black/40 p-4 flex items-center justify-between">
                          <span className="text-xs font-mono text-zinc-200">{ach.certificateName || "Document"}</span>
                          <a href={ach.certificateData} download={ach.certificateName || "certificate.pdf"} className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[11px] font-bold font-mono rounded-lg">⬇ Download</a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}