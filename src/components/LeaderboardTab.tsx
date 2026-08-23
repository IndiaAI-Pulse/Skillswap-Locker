"use client";

import { useState, useEffect } from "react";
import { getLeaderboard } from "@/actions/credentials";

export default function LeaderboardTab({ currentUserId }: { currentUserId: string }) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(data => { setLeaders(data); setLoading(false); });
  }, []);

  const medals = ["🥇", "🥈", "🥉"];
  const getScoreColor = (score: number) => score >= 70 ? "text-emerald-400" : score >= 40 ? "text-yellow-400" : "text-red-400";

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl animate-fadeIn">
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">🏆 Leaderboard</h2>
        <p className="text-xs text-zinc-500 font-mono mt-0.5">Top students ranked by portfolio score</p>
      </div>

      {/* TOP 3 PODIUM */}
      {leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mb-2">
          {[leaders[1], leaders[0], leaders[2]].map((u, podiumIdx) => {
            const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
            const isFirst = rank === 1;
            return (
              <div key={u.id} className={`flex flex-col items-center p-4 rounded-2xl border text-center ${isFirst ? "bg-yellow-500/10 border-yellow-500/30 scale-105" : "bg-white/[0.02] border-white/10"}`}>
                <span className="text-2xl">{medals[rank - 1]}</span>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg mt-2 ${isFirst ? "bg-yellow-500/20 border-2 border-yellow-500/50" : "bg-zinc-900 border-2 border-white/10"}`}>
                  {u.image ? <img src={u.image} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" /> : <span className="text-purple-300">{u.name?.charAt(0)}</span>}
                </div>
                <p className="text-xs font-bold text-white mt-2 truncate w-full">{u.name}</p>
                <p className="text-[10px] text-zinc-500 font-mono truncate w-full">{u.school || "—"}</p>
                <span className={`text-lg font-black font-mono mt-1 ${getScoreColor(u.score)}`}>{u.score}</span>
                <span className="text-[9px] text-zinc-500 font-mono">/ 100</span>
                {u.id === currentUserId && <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full mt-1 font-bold">You</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* FULL LIST */}
      <div className="space-y-2">
        {leaders.map((u, idx) => {
          const isMe = u.id === currentUserId;
          return (
            <div key={u.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isMe ? "bg-purple-500/10 border-purple-500/30" : "bg-white/[0.02] border-white/5 hover:border-white/10"}`}>
              <span className="text-sm font-black font-mono text-zinc-400 w-6 text-center">{idx < 3 ? medals[idx] : `#${idx + 1}`}</span>
              <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                {u.image ? <img src={u.image} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" /> : u.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white truncate">{u.name}</p>
                  {isMe && <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0">You</span>}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono truncate">{u.school || "—"} • {u.classYear || "—"}</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 shrink-0">
                <div className="text-center hidden sm:block"><div className="text-white font-bold">{u.credentials}</div><div>creds</div></div>
                <div className="text-center hidden sm:block"><div className="text-white font-bold">{u.sessions}</div><div>sessions</div></div>
                <div className="text-center"><div className={`text-lg font-black ${getScoreColor(u.score)}`}>{u.score}</div><div>score</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}