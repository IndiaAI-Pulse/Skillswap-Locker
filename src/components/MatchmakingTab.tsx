"use client";

import { useState, useEffect } from "react";
import { findSkillMatches } from "@/actions/matchmaker";

interface MatchmakingTabProps {
  currentUserId: string;
}

export default function MatchmakingTab({ currentUserId }: MatchmakingTabProps) {
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function triggerMatchmakingEngine() {
      setLoading(true);
      setError(null);
      try {
        const response = await findSkillMatches(currentUserId);
        if (response.error) {
          setError(response.error);
        } else {
          setAiMatches(response.matches || []);
        }
      } catch (err) {
        console.error("Matchmaking interface error:", err);
        setError("Failed to stream synchronization with database matrix.");
      } finally {
        setLoading(false);
      }
    }

    triggerMatchmakingEngine();
  }, [currentUserId]);

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      {/* Banner */}
      <div>
        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          ⚡ AI Neural Sync Node
        </h2>
        <p className="text-xs text-zinc-400 mt-1 font-medium">
          Agent Slyx uses multi-factor mathematical matrices to fetch top intersecting peer connections for you.
        </p>
      </div>

      {/* Main Container Loader/Error/Cards states */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/5 rounded-2xl">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(147,51,234,0.4)]" />
          <p className="text-xs font-mono text-purple-400 mt-4 animate-pulse uppercase tracking-widest">
            Running Cross-Intersection Neural Formulas...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-2xl text-center text-xs font-mono text-red-400">
          ⚠️ Engine Error: {error}
        </div>
      ) : aiMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {aiMatches.map((match) => (
            <div 
              key={match.id} 
              className="bg-gradient-to-br from-white/[0.03] via-white/[0.01] to-purple-500/[0.02] border border-white/10 hover:border-purple-500/40 p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(147,51,234,0.15)] group relative overflow-hidden"
            >
              <div>
                {/* Score Header badge */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white truncate max-w-[130px]">{match.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[140px] mt-0.5">
                      {match.school} • {match.classYear}
                    </p>
                  </div>
                  <span className="text-xs font-black font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-1 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    {match.score}% Match
                  </span>
                </div>

                {/* Agent Breakdown text */}
                <div className="bg-black/40 border border-purple-500/20 p-3 rounded-xl mb-4 relative">
                  <p className="text-[11px] text-zinc-300 font-mono italic leading-relaxed">
                    <span className="text-[9px] font-black uppercase tracking-wider mr-1.5 bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-400/30">
                      🦊 SLYX
                    </span>
                    {match.analysis}
                  </p>
                </div>
              </div>

              {/* Skills Footer mapping */}
              <div className="border-t border-white/5 pt-3 space-y-1.5 text-[11px] font-sans">
                <div className="flex items-start gap-1 truncate">
                  <span className="text-zinc-500 font-mono font-bold shrink-0">Offers:</span>
                  <span className="text-purple-300 font-semibold truncate">
                    {match.skillsToTeach?.map((s: any) => s.skill).join(", ") || "None Listed"}
                  </span>
                </div>
                <div className="flex items-start gap-1 truncate">
                  <span className="text-zinc-500 font-mono font-bold shrink-0">Seeks:</span>
                  <span className="text-cyan-300 font-semibold truncate">
                    {match.skillsToLearn?.map((s: any) => s.skill).join(", ") || "None Listed"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
          <p className="text-xs font-mono text-zinc-500">
            No other peer intersections detected on current coordinates. Try adding more skills in your dashboard deck!
          </p>
        </div>
      )}
    </div>
  );
}