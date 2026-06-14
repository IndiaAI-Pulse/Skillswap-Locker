"use client";

import { useState, useEffect } from "react";
import { getUserSessions, confirmSession } from "@/actions/credentials";
import { getConnectedUsers } from "@/actions/profile";

interface SessionsTabProps {
  user: { id: string; name: string; skillsToTeach: any };
  onNavigateToFeedback?: () => void;
}

export default function SessionsTab({ user, onNavigateToFeedback }: SessionsTabProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);

  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [bookSkill, setBookSkill] = useState("");
  const [bookLearner, setBookLearner] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookMeetLink, setBookMeetLink] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const currentYear = currentDate.getFullYear();
  const currentMonthName = currentDate.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentDate.getMonth(), 1).getDay();
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const parseJSON = (val: any) => {
    if (!val) return [];
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  };

  const myTeachSkills = parseJSON(user.skillsToTeach);

  const TIME_SLOTS = [
    "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM",
    "12:00 PM - 01:00 PM", "01:00 PM - 02:00 PM", "02:00 PM - 03:00 PM",
    "03:00 PM - 04:00 PM", "04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM",
    "06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"
  ];

  useEffect(() => {
    loadSessions();
    loadConnectedUsers();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getUserSessions(user.id);
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConnectedUsers = async () => {
    try {
      const users = await getConnectedUsers(user.id);
      setConnectedUsers(users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookSession = async () => {
    if (!bookSkill || !bookLearner || !bookDate || !bookTime) {
      alert("Please fill in all required fields.");
      return;
    }

    const timeMap: Record<string, number> = {
      "09:00 AM - 10:00 AM": 9, "10:00 AM - 11:00 AM": 10, "11:00 AM - 12:00 PM": 11,
      "12:00 PM - 01:00 PM": 12, "01:00 PM - 02:00 PM": 13, "02:00 PM - 03:00 PM": 14,
      "03:00 PM - 04:00 PM": 15, "04:00 PM - 05:00 PM": 16, "05:00 PM - 06:00 PM": 17,
      "06:00 PM - 07:00 PM": 18, "07:00 PM - 08:00 PM": 19,
    };

    const scheduledDate = new Date(bookDate);
    scheduledDate.setHours(timeMap[bookTime] || 9, 0, 0, 0);

    setCreatingSession(true);
    try {
      const res = await fetch("/api/demo-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: user.id,
          learnerId: bookLearner,
          skill: bookSkill,
          scheduledAt: scheduledDate.toISOString(),
          meetLink: bookMeetLink.trim() || null,
        }),
      });
      if (res.ok) {
        setBookSkill(""); setBookLearner(""); setBookDate(""); setBookTime(""); setBookMeetLink("");
        setShowBookForm(false);
        await loadSessions();
      } else {
        alert("Failed to book session.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleConfirm = async (sessionId: string, role: "teacher" | "learner") => {
    setConfirmingId(sessionId);
    try {
      await confirmSession(sessionId, user.id, role);
      await loadSessions();
    } catch (err) {
      console.error(err);
      alert("Failed to confirm session.");
    } finally {
      setConfirmingId(null);
    }
  };

  const getSessionsForDay = (day: number) => {
    return sessions.filter((s) => {
      const d = new Date(s.scheduledAt);
      return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentYear;
    });
  };

  const shiftMonth = (dir: "prev" | "next") => {
    setCurrentDate(new Date(currentYear, dir === "next" ? currentDate.getMonth() + 1 : currentDate.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const getStatusColor = (status: string) => {
    if (status === "completed") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (status === "confirmed") return "text-cyan-400 bg-cyan-500/10 border-cyan-500/30";
    if (status === "pending") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
  };

  const isLearner = (s: any) => s.learnerId === user.id;

  // Meet link unlocks 15 mins before session start
  const canJoinMeet = (scheduledAt: string) => {
    const start = new Date(scheduledAt);
    const unlockTime = new Date(start.getTime() - 15 * 60 * 1000);
    return new Date() >= unlockTime;
  };

  // Session time slot has ended (1 hour duration)
  const sessionEnded = (scheduledAt: string) => {
    const end = new Date(scheduledAt);
    end.setHours(end.getHours() + 1);
    return new Date() >= end;
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn text-zinc-200 p-4">
      <div className="flex justify-between items-center bg-gradient-to-r from-purple-500/[0.03] to-cyan-500/[0.03] border border-white/10 p-5 rounded-2xl">
        <div>
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-purple-400"></span> Your Sessions 
          </h3>
          <p className="text-xs text-zinc-400">Keep track of your learning and teaching sessions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "calendar" ? "list" : "calendar")}
            className={`px-4 py-2 border text-xs font-bold font-mono rounded-xl transition-all ${view === "calendar" ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-200"}`}
          >
            {view === "calendar" ? "📋 Sessions List" : "📅 Calendar View"}
          </button>
          {myTeachSkills.length > 0 && (
            <button
              onClick={() => setShowBookForm(!showBookForm)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold font-mono rounded-xl transition-all"
            >
              {showBookForm ? "✕ Cancel" : "+ Book Session"}
            </button>
          )}
        </div>
      </div>

      {showBookForm && (
        <div className="bg-gradient-to-br from-purple-900/10 to-transparent border border-purple-500/20 rounded-2xl p-6 space-y-5">
          <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-purple-300">📚 Book a Session</h3>
          <p className="text-[11px] text-zinc-500 font-mono">You can book sessions for skills you teach.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-purple-400">What will you teach? *</label>
              <select value={bookSkill} onChange={(e) => setBookSkill(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 font-mono">
                <option value="">-- Select a skill --</option>
                {myTeachSkills.map((s: any, i: number) => <option key={i} value={s.skill}>{s.skill} ({s.level})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">Who's joining? *</label>
              <select value={bookLearner} onChange={(e) => setBookLearner(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50 font-mono">
                <option value="">-- Select a learner --</option>
                {connectedUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Session Date *</label>
              <input type="date" value={bookDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setBookDate(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Time Slot *</label>
              <select value={bookTime} onChange={(e) => setBookTime(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 font-mono">
                <option value="">-- Select time slot --</option>
                {TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Google Meet / Zoom Link (optional)</label>
            <input type="url" placeholder="https://meet.google.com/xxx-xxxx-xxx" value={bookMeetLink} onChange={(e) => setBookMeetLink(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 font-mono" />
          </div>

          <button onClick={handleBookSession} disabled={creatingSession} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-bold font-mono uppercase tracking-widest rounded-xl transition-all">
            {creatingSession ? "Booking..." : "📩 Send Request"}
          </button>
        </div>
      )}

      {view === "calendar" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white/[0.02] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-sm font-black text-white">📅 Calendar</h3>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1.5 rounded-xl">
              <button onClick={() => shiftMonth("prev")} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-all">◀</button>
              <span className="text-xs font-black font-mono px-4 text-purple-400 uppercase tracking-widest min-w-[130px] text-center">{currentMonthName} {currentYear}</span>
              <button onClick={() => shiftMonth("next")} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-all">▶</button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/[0.02] to-transparent border border-white/10 p-4 rounded-2xl space-y-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black font-mono tracking-wider text-purple-500/80 uppercase pb-2 border-b border-white/5">
              {DAYS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-2 items-start">
              {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`e-${i}`} className="aspect-square opacity-0" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = day === selectedDay;
                const daySessions = getSessionsForDay(day);
                const isCurrentDay = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentYear === new Date().getFullYear();

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-xl p-2 flex flex-col items-start border text-left transition-all relative group overflow-hidden ${
                      isSelected
                        ? "col-span-2 min-h-[150px] bg-gradient-to-br from-purple-950/40 to-cyan-950/20 border-purple-400 shadow-xl scale-[1.01] z-10"
                        : "aspect-square min-h-[60px] bg-white/[0.01] border-white/5 text-zinc-400 hover:bg-white/[0.04] hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className={`font-mono text-xs font-black ${isCurrentDay && !isSelected ? "text-cyan-400" : isSelected ? "text-purple-300 text-sm" : "text-zinc-500"}`}>{day}</span>
                      {isCurrentDay && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                      {daySessions.length > 0 && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                    </div>
                    {isSelected ? (
                      <div className="w-full flex-1 flex flex-col justify-between space-y-2 text-[11px] font-mono animate-fadeIn">
                        {daySessions.length > 0 ? (
                          <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1 w-full">
                            {daySessions.map((s) => {
                              const userIsLearner = s.learnerId === user.id;
                              return (
                                <div key={s.id} className="p-1.5 rounded bg-black/40 border border-white/5 space-y-0.5 w-full">
                                  <div className="text-white font-black truncate">{s.skill}</div>
                                  <div className="text-[10px] text-zinc-400">🕒 {new Date(s.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                                  <div className="text-[9px] text-purple-300 font-semibold truncate">
                                    {userIsLearner ? `👨‍🏫 Teacher: ${s.teacher?.name || "Unknown"}` : `🧑‍💻 Learner: ${s.learner?.name || "Unknown"}`}
                                  </div>
                                  <div className={`text-[8px] uppercase tracking-widest font-black inline-block mt-0.5 px-1 rounded border ${
                                    s.status === "confirmed" ? "text-cyan-400 border-cyan-500/20" : s.status === "completed" ? "text-emerald-400 border-emerald-500/20" : "text-yellow-400 border-yellow-500/20"
                                  }`}>{s.status}</div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-zinc-600 text-[10px] italic py-2">No sessions.</div>
                        )}
                      </div>
                    ) : (
                      daySessions.length > 0 && (
                        <div className="mt-auto text-[9px] font-mono text-purple-400 font-bold group-hover:text-purple-300">
                          {daySessions.length} {daySessions.length === 1 ? "Session" : "Sessions"}
                        </div>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {getSessionsForDay(selectedDay).length > 0 && (
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <h4 className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 border-b border-white/5 pb-1.5">Quick Actions</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getSessionsForDay(selectedDay).map((s) => {
                  const amLearner = s.learnerId === user.id;
                  const currentRole = amLearner ? "learner" : "teacher";
                  const hasUserConfirmed = amLearner ? s.learnerConfirm : s.teacherConfirm;
                  const canConfirm = !hasUserConfirmed && s.status === "pending";
                  const meetUnlocked = canJoinMeet(s.scheduledAt);

                  return (
                    <div key={s.id} className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-black text-white font-mono">{s.skill}</span>
                          {s.meetLink && (
                            meetUnlocked ? (
                              <a href={s.meetLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-cyan-400 hover:underline">🔗 Join</a>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-600">🔒 Link locked</span>
                            )
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-1">
                          {amLearner ? `Teacher: ${s.teacher?.name || "Unknown"}` : `Learner: ${s.learner?.name || "Unknown"}`}
                        </div>
                        {s.meetLink && !meetUnlocked && (
                          <div className="text-[9px] text-zinc-600 font-mono mt-0.5">Unlocks 15 min before your session</div>
                        )}
                      </div>
                      {canConfirm && (
                        <button onClick={() => handleConfirm(s.id, currentRole)} disabled={confirmingId === s.id} className="mt-2 w-full py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black font-mono uppercase rounded">
                          {confirmingId === s.id ? "Confirming..." : "✓ Confirm Slot"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "list" && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-sm font-bold text-zinc-300 mb-2">No Sessions Yet</h3>
            <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">
              {myTeachSkills.length > 0 ? "Click Book Session to teach a skill." : "Add skills you can teach in Dashboard to start booking."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const amLearner = isLearner(session);
              const currentRole = amLearner ? "learner" : "teacher";
              const hasCredential = session.credentials && session.credentials.length > 0;
              const myCredential = session.credentials?.find((c: any) => c.userId === user.id);
              const hasUserConfirmed = amLearner ? session.learnerConfirm : session.teacherConfirm;
              const needsAction = session.status === "pending" && !hasUserConfirmed;
              const myFeedbackGiven = session.feedbacks?.some((f: any) => f.giverId === user.id);
              const ended = sessionEnded(session.scheduledAt);
              const canGiveFeedback = ended && (session.status === "confirmed" || session.status === "completed") && !myFeedbackGiven;
              const meetUnlocked = canJoinMeet(session.scheduledAt);

              return (
                <div key={session.id} className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 hover:border-purple-500/20 rounded-2xl p-5 transition-all">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg shrink-0">📚</div>
                      <div>
                        <h4 className="text-sm font-black text-white">{session.skill}</h4>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {amLearner ? `Learning from ${session.teacher?.name || "Unknown"}` : `Teaching ${session.learner?.name || "Unknown"}`}
                          {" • "}
                          {new Date(session.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" • "}
                          {new Date(session.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {session.meetLink && (
                          meetUnlocked ? (
                            <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors mt-0.5 block">🔗 Join Meeting</a>
                          ) : (
                            <p className="text-[10px] font-mono text-zinc-600 mt-0.5">🔒 Meeting link unlocks 15 min before start</p>
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border ${getStatusColor(session.status)}`}>{session.status.toUpperCase()}</span>
                      {myCredential && (
  <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border text-purple-300 bg-purple-500/10 border-purple-500/30">🏅 {myCredential.proficiency}</span>
)}
                      {canGiveFeedback && (
                        <button onClick={() => onNavigateToFeedback?.()} className="px-3 py-1.5 bg-gradient-to-r from-yellow-600/80 to-orange-600/80 hover:from-yellow-500 hover:to-orange-500 text-white text-[11px] font-bold font-mono rounded-lg transition-all">
                          ⭐ Give Feedback →
                        </button>
                      )}
                      {myFeedbackGiven && (
                        <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border text-emerald-400 bg-emerald-500/10 border-emerald-500/30">✓ Feedback Given</span>
                      )}
                    </div>
                  </div>

                  {needsAction && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <p className="text-[11px] text-yellow-400/90 font-mono">⚠️ Please confirm to lock in this session.</p>
                      <button disabled={confirmingId === session.id} onClick={() => handleConfirm(session.id, currentRole)} className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono rounded-xl transition-all">
                        {confirmingId === session.id ? "Confirming..." : "👍 I'm In!"}
                      </button>
                    </div>
                  )}

                  {session.status === "pending" && hasUserConfirmed && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-[11px] text-zinc-500 font-mono italic">⏳ Waiting for the other person to confirm...</p>
                    </div>
                  )}

                  {session.status === "pending" && (
                    <div className="mt-2.5 flex gap-3 text-[10px] font-mono">
                      <span className={session.teacherConfirm ? "text-emerald-400" : "text-zinc-600"}>{session.teacherConfirm ? "✓" : "○"} Teacher confirmed</span>
                      <span className={session.learnerConfirm ? "text-emerald-400" : "text-zinc-600"}>{session.learnerConfirm ? "✓" : "○"} Learner confirmed</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}