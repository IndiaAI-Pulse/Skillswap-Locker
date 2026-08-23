"use client";

import { useState } from "react";

interface Props {
  userId: string;
  skillsToTeach: { skill: string; level: string }[];
  skillsToLearn: { skill: string; level: string }[];
  credentials: { skill: string; proficiency: string }[];
  sessions: number;
}

interface GapResult {
  summary: string;
  strengths: string[];
  gaps: { skill: string; reason: string; suggestion: string }[];
  nextSteps: string[];
  demandInsight: string;
}

export default function SkillGapAnalyser({ userId, skillsToTeach, skillsToLearn, credentials, sessions }: Props) {
  const [result, setResult] = useState<GapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyse = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, skillsToTeach, skillsToLearn, credentials, sessions }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">🧠 AI Skill Gap Analyser</h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">SLYX analyses your profile and tells you exactly what to learn next</p>
        </div>
        <button
          onClick={analyse}
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-bold font-mono rounded-xl transition-all"
        >
          {loading ? "Analysing..." : "⚡ Analyse My Skills"}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 bg-white/[0.01] border border-white/5 rounded-2xl gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-purple-400 animate-pulse">SLYX is reading your profile...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-mono">{error}</div>
      )}

      {result && (
        <div className="space-y-4">

          {/* SUMMARY */}
          <div className="bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🦊</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 font-mono">SLYX says</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">{result.summary}</p>
          </div>

          {/* STRENGTHS */}
          {result.strengths.length > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-400">✅ Your Strengths</h3>
              <div className="flex flex-wrap gap-2">
                {result.strengths.map((s, i) => (
                  <span key={i} className="text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-lg font-mono">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* GAPS */}
          {result.gaps.length > 0 && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-yellow-400">🎯 Skill Gaps Identified</h3>
              <div className="space-y-3">
                {result.gaps.map((gap, i) => (
                  <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{gap.skill}</span>
                      <span className="text-[10px] text-yellow-400 font-mono bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">GAP</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{gap.reason}</p>
                    <p className="text-[11px] text-cyan-400 font-mono">💡 {gap.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEMAND INSIGHT */}
          {result.demandInsight && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-cyan-400 mb-2">📈 Market Demand Insight</h3>
              <p className="text-[11px] text-zinc-300 leading-relaxed">{result.demandInsight}</p>
            </div>
          )}

          {/* NEXT STEPS */}
          {result.nextSteps.length > 0 && (
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-zinc-300">🚀 Recommended Next Steps</h3>
              <div className="space-y-2">
                {result.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[10px] font-black text-purple-300 shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center space-y-3">
          <span className="text-4xl">🧠</span>
          <h3 className="text-sm font-bold text-zinc-300">Ready to analyse your skill profile</h3>
          <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">SLYX will look at your current skills, credentials earned, sessions completed, and what you want to learn — then give you a personalised roadmap.</p>
        </div>
      )}
    </div>
  );
}