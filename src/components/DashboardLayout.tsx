"use client";

import { useState, useEffect } from "react";
import { getUpcomingSessions, updateProfile } from "@/actions/profile";
import { signOut } from "next-auth/react";
import CredentialPassport from "@/components/CredentialPassport";
import AchievementsTab from "@/components/AchievementsTab";
import SessionsTab from "@/components/SessionsTab";
import { updateDashboardSkills } from "@/actions/onboard";
import { findSkillMatches } from "@/actions/matchmaker";
import { getUserCredits, getPortfolioScore } from "@/actions/credentials";
import MessagesTab from "@/components/MessagesTab";
import FeedbackTab from "@/components/FeedbackTab";
import SlyxChat from "@/components/SlyxChat";


interface DashboardLayoutProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    school?: string;
    classYear?: string;
    age?: number;
    location?: string;
    credits: number;
    skillsToTeach: any;
    skillsToLearn: any;
    teachingMethod?: string;
    preferredDays?: any;
  };
}

const LEARNING_METHODS = ["Visual & examples", "Discussion-based", "Debate-oriented", "Project-based"];
const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DashboardLayout({ user }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editType, setEditType] = useState<"teach" | "learn" | null>(null);
  const [activeTask, setActiveTask] = useState<"menu" | "add" | "level" | "delete" | null>(null);
  const [inputSkill, setInputSkill] = useState("");
  const [inputLevel, setInputLevel] = useState("Basic");
  const [selectedSkillIndex, setSelectedSkillIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [learnFilter, setLearnFilter] = useState<string>("None");
  const [teachFilter, setTeachFilter] = useState<string>("None");
  const [credits, setCredits] = useState(user.credits || 100);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolioScore, setPortfolioScore] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [slyxOpen, setSlyxOpen] = useState(false);
  
  // CHAT CONTROLLER TARGET STATE
  const [chatTargetUserId, setChatTargetUserId] = useState<string | null>(null);

  const parseJSON = (val: any) => {
    if (!val) return [];
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  };

  const [myTeach, setMyTeach] = useState<any[]>(() => parseJSON(user.skillsToTeach));
  const [myLearn, setMyLearn] = useState<any[]>(() => parseJSON(user.skillsToLearn));

  // Profile management states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user.name || "",
    school: user.school || "",
    classYear: user.classYear || "XII",
    age: user.age || 18,
    location: user.location || "",
    teachingMethod: user.teachingMethod || "Hybrid",
    preferredDays: parseJSON(user.preferredDays) as string[],
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (activeTab === "matchmaking" && aiMatches.length === 0) {
      executeMatchingPipeline();
    }
    if (activeTab === "dashboard") {
      loadDashboardData();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      const [creditData, scoreData, upcomingData] = await Promise.all([
        getUserCredits(user.id),
        getPortfolioScore(user.id),
        getUpcomingSessions(user.id),
      ]);
      setCredits(creditData.balance);
      setTransactions(creditData.transactions);
      setPortfolioScore(scoreData);
      setUpcomingSessions(upcomingData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const executeMatchingPipeline = async () => {
    if (!user?.id) return;
    setLoadingMatches(true);
    setMatchError(null);
    try {
      const targetLearn = learnFilter === "None" ? undefined : learnFilter;
      const targetTeach = teachFilter === "None" ? undefined : teachFilter;
      const res = await findSkillMatches(user.id, targetLearn, targetTeach);
      if (res?.error) setMatchError(res.error);
      else setAiMatches(res?.matches || []);
    } catch (err) {
      setMatchError("Failed to synchronize with backend matchmaker matrix.");
    } finally {
      setLoadingMatches(false);
    }
  };

  const triggerEditWizard = (type: "teach" | "learn") => {
    setEditType(type);
    setActiveTask("menu");
    setInputSkill("");
    setInputLevel("Basic");
    setSelectedSkillIndex(-1);
  };

  const handlePersistSkills = async (updatedArray: any[], type: "teach" | "learn") => {
    setLoading(true);
    try {
      await updateDashboardSkills(user.id, updatedArray, type);
      if (type === "teach") setMyTeach(updatedArray);
      else setMyLearn(updatedArray);
      setActiveTask(null);
      setEditType(null);
    } catch (err) {
      alert("Failed to save skills.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setProfileForm(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day]
    }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        userId: user.id,
        name: profileForm.name,
        school: profileForm.school,
        classYear: profileForm.classYear,
        age: Number(profileForm.age),
        location: profileForm.location,
        teachingMethod: profileForm.teachingMethod,
        preferredDays: profileForm.preferredDays,
      });
      setIsEditingProfile(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      alert("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "🎛️" },
    { id: "passport", label: "Credential Passport", icon: "🏅" },
    { id: "sessions", label: "Sessions", icon: "📅" },
    { id: "achievements", label: "Achievements", icon: "🏆" },
    { id: "matchmaking", label: "AI Matchmaking", icon: "✨" },
    { id: "messages", label: "Messages", icon: "💬" },
    { id: "feedback", label: "Feedback", icon: "⭐" },
    { id: "profile", label: "My Profile", icon: "👤" }
  ];

  return (
    <div className="flex min-h-screen bg-[#030303] text-white overflow-hidden relative selection:bg-purple-500/30 font-sans antialiased">
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-600/10 to-fuchsia-600/5 blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-cyan-600/10 to-blue-600/5 blur-[160px] pointer-events-none z-0" />
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-black/40 backdrop-blur-2xl border-r border-white/10 flex flex-col h-screen sticky top-0 shrink-0 z-20 shadow-[10px_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="p-5 space-y-6 flex-1 overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-base shadow-[0_0_20px_rgba(147,51,234,0.3)] text-white">S</div>
            <div>
              <h1 className="font-black tracking-tight text-md bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">SkillSwap</h1>
              <p className="text-[10px] text-purple-400 font-mono font-bold tracking-widest uppercase -mt-0.5">LOCKER v0.2</p>
            </div>
          </div>
          <nav className="space-y-1.5 pt-4 max-h-[62vh] overflow-y-auto pr-1 custom-scrollbar">
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setEditType(null);
                    setActiveTask(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group border ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent text-purple-300 border-purple-500/40 shadow-[0_0_25px_rgba(147,51,234,0.15)] font-bold scale-[1.01]"
                      : "text-zinc-400 border-transparent hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {isSelected && <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(147,51,234,1)]" />}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* USER FOOTER */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex flex-col gap-3 min-w-0 shrink-0">
          <div onClick={() => setActiveTab("profile")} className="flex items-center gap-3 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-md p-2.5 rounded-xl border border-white/10 cursor-pointer hover:border-purple-500/40 transition-all group">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-purple-500 overflow-hidden flex items-center justify-center text-sm font-bold shrink-0 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
              {user.image ? (
                <img src={user.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-purple-400">{user.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="truncate flex-1">
              <h4 className="text-xs font-bold truncate text-zinc-100 tracking-tight group-hover:text-purple-300 transition-colors">
                {profileForm.name || user.name}
              </h4>
              <p className="text-[10px] text-zinc-500 truncate font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full py-2 bg-white/[0.02] hover:bg-red-950/20 hover:border-red-500/40 hover:text-red-400 border border-white/10 text-xs font-semibold rounded-xl transition-all duration-300"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen overflow-y-auto p-8 lg:p-10 z-10 bg-transparent">
        {/* TOP BANNER */}
        <div className="bg-gradient-to-br from-white/[0.04] via-white/[0.01] to-purple-500/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 relative z-10">
            <span className="text-[9px] font-black font-mono tracking-widest text-purple-300 uppercase bg-purple-500/20 px-3 py-1 border border-purple-500/30 rounded-md">
              {profileForm.school || user.school || "Institution"}
            </span>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent pt-1">
              Welcome back, {(profileForm.name || user.name)?.split(" ")[0]}!
            </h2>
            <div className="flex gap-3 pt-1 text-xs font-mono text-purple-300">
              <div className="bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                Grade: <span className="text-white font-bold ml-1">{profileForm.classYear || user.classYear || "XII"}</span>
              </div>
              <div className="bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                Age: <span className="text-white font-bold ml-1">{profileForm.age || user.age || 18} Yrs</span>
              </div>
              {portfolioScore && (
                <div className="bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                  Score: <span className={`font-bold ml-1 ${getScoreColor(portfolioScore.score)}`}>{portfolioScore.score}/100</span>
                </div>
              )}
            </div>
          </div>
          <button
  onClick={() => setSlyxOpen(true)}
  className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/40 p-4 rounded-2xl shadow-lg min-w-[280px] flex items-center gap-3 backdrop-blur-xl hover:border-cyan-400/60 transition-all cursor-pointer text-left"
>
  <div className="flex flex-col items-center justify-center shrink-0 border-r border-white/10 pr-3">
    <span className="text-2xl filter drop-shadow-[0_0_10px_rgba(6,182,212,0.6)] animate-pulse">🦊</span>
    <span className="text-[9px] font-black tracking-widest text-cyan-400 font-mono mt-1">SLYX</span>
  </div>
  <p className="text-[11px] text-zinc-300 leading-relaxed">
    {portfolioScore?.credentials > 0
      ? `You've earned ${portfolioScore.credentials} credential${portfolioScore.credentials > 1 ? "s" : ""}! Score: ${portfolioScore.score}/100. Tap to chat with me 🦊`
      : "Complete a session and get feedback to earn your first credential. Tap to chat with me!"}
  </p>
</button>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-gradient-to-br from-purple-500/[0.08] via-transparent to-transparent backdrop-blur-xl border border-purple-500/30 p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Portfolio Score</p>
                  <h3 className={`text-3xl font-black mt-1 font-mono ${getScoreColor(portfolioScore?.score || 0)}`}>
                    {loadingDashboard ? "-" : portfolioScore?.score || 0}
                    <span className="text-xs text-purple-500 ml-1">/100</span>
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">🎯</div>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/[0.08] via-transparent to-transparent backdrop-blur-xl border border-cyan-500/30 p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">Credits</p>
                  <h3 className="text-3xl font-black text-white mt-1 font-mono">
                    {credits} <span className="text-xs text-cyan-500">⚡</span>
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">⚡</div>
              </div>

              <div onClick={() => setActiveTab("sessions")} className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center justify-between shadow-md cursor-pointer hover:border-purple-500/30 transition-all">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Upcoming Sessions</p>
                  <h3 className="text-3xl font-black text-white mt-1 font-mono">{upcomingSessions.length}</h3>
                  {upcomingSessions[0] && (
                    <p className="text-[10px] text-zinc-500 font-mono mt-1 truncate max-w-[120px]">Next: {upcomingSessions[0].skill}</p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">📅</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/[0.08] via-transparent to-transparent backdrop-blur-xl border border-yellow-500/30 p-5 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-yellow-400">Credentials</p>
                  <h3 className="text-3xl font-black text-white mt-1 font-mono">
                    {loadingDashboard ? "—" : portfolioScore?.credentials || 0}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">🏅</div>
              </div>
            </div>

            {/* CREDITS LEDGER */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2"><span className="text-cyan-400">⚡</span> Credits Ledger</h3>
              {transactions.length === 0 ? (
                <p className="text-xs text-zinc-600 font-mono text-center py-4">No transactions yet. Earn credits by completing sessions and giving feedback.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center bg-black/40 border border-white/5 rounded-xl px-4 py-2.5">
                      <span className="text-xs text-zinc-300 font-mono">{tx.reason}</span>
                      <span className={`text-xs font-black font-mono ${tx.type === "earn" ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.type === "earn" ? "+" : "-"}{tx.amount} ⚡
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SKILLS PANELS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* TEACHING */}
              <div className="bg-white/[0.02] border border-purple-500/25 rounded-2xl p-6 space-y-5 shadow-lg relative">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold tracking-wide text-zinc-200 flex items-center gap-2"><span className="text-purple-400">⚔️</span> Your Teaching Arsenal</h3>
                  <button onClick={() => triggerEditWizard("teach")} className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-600 border border-purple-500/40 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all">✏️ Edit</button>
                </div>
                
                {editType === "teach" && activeTask && (
                  <div className="bg-black border border-purple-500/50 p-4 rounded-xl space-y-3 shadow-2xl relative z-30">
                    <div className="flex justify-between items-center text-xs font-bold font-mono text-purple-400">
                      <span>⚙️ SKILL OPERATIONS</span>
                      <button onClick={() => { setActiveTask(null); setEditType(null); }} className="text-zinc-500 hover:text-white">✕</button>
                    </div>
                    {activeTask === "menu" && (
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setActiveTask("add")} className="p-2 bg-white/5 text-[11px] font-bold rounded-lg border border-white/10 text-purple-300 hover:bg-purple-950/30 transition-all">+ Add New</button>
                        <button onClick={() => setActiveTask("level")} className="p-2 bg-white/5 text-[11px] font-bold rounded-lg border border-white/10 text-purple-300 hover:bg-purple-950/30 transition-all">⚙️ Change Level</button>
                        <button onClick={() => setActiveTask("delete")} className="p-2 bg-white/5 text-[11px] font-bold rounded-lg border border-white/10 text-red-400 hover:bg-red-950/20 transition-all">💥 Delete</button>
                      </div>
                    )}
                    {activeTask === "add" && (
                      <div className="space-y-2">
                        <input type="text" placeholder="Skill name" value={inputSkill} onChange={e => setInputSkill(e.target.value)} className="w-full bg-zinc-950 border border-purple-500/40 rounded-lg p-2 text-xs outline-none focus:border-purple-400 text-white" />
                        <div className="flex gap-2">
                          <select value={inputLevel} onChange={e => setInputLevel(e.target.value)} className="flex-1 bg-zinc-950 border border-purple-500/40 rounded-lg p-2 text-xs text-purple-300 outline-none">
                            <option>Basic</option>
                            <option>Intermediate</option>
                            <option>Advance</option>
                          </select>
                          <button onClick={() => { const u = [...myTeach, { skill: inputSkill.trim(), level: inputLevel }]; handlePersistSkills(u, "teach"); }} disabled={loading || !inputSkill.trim()} className="px-4 bg-purple-600 hover:bg-purple-500 text-xs font-bold rounded-lg transition-all">{loading ? "Saving..." : "Add"}</button>
                        </div>
                      </div>
                    )}
                    {activeTask === "level" && (
                      <div className="space-y-2">
                        <select onChange={e => setSelectedSkillIndex(Number(e.target.value))} value={selectedSkillIndex} className="w-full bg-zinc-950 border border-purple-500/40 rounded-lg p-2 text-xs text-white">
                          <option value={-1}>-- Select Skill --</option>
                          {myTeach.map((s, i) => <option key={i} value={i}>{s.skill} ({s.level})</option>)}
                        </select>
                        {selectedSkillIndex >= 0 && (
                          <div className="flex gap-2">
                            <select value={inputLevel} onChange={e => setInputLevel(e.target.value)} className="flex-1 bg-zinc-950 border border-purple-500/40 rounded-lg p-2 text-xs text-purple-300">
                              <option>Basic</option>
                              <option>Intermediate</option>
                              <option>Advance</option>
                            </select>
                            <button onClick={() => { const u = [...myTeach]; u[selectedSkillIndex].level = inputLevel; handlePersistSkills(u, "teach"); }} className="px-4 bg-purple-600 text-xs font-bold rounded-lg">Update</button>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTask === "delete" && (
                      <div className="space-y-2">
                        <select onChange={e => setSelectedSkillIndex(Number(e.target.value))} value={selectedSkillIndex} className="w-full bg-zinc-950 border border-red-500/40 rounded-lg p-2 text-xs text-white">
                          <option value={-1}>-- Select Skill to Delete --</option>
                          {myTeach.map((s, i) => <option key={i} value={i}>{s.skill}</option>)}
                        </select>
                        {selectedSkillIndex >= 0 && (
                          <button onClick={() => { const u = myTeach.filter((_, i) => i !== selectedSkillIndex); handlePersistSkills(u, "teach"); }} className="w-full py-2 bg-red-600 text-xs font-bold rounded-lg text-white">Confirm Wipe</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-3">
                  {myTeach.length > 0 ? (
                    myTeach.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/10 p-4 rounded-xl group hover:border-purple-500/30 transition-all">
                        <span className="text-sm font-semibold text-zinc-200">{s.skill}</span>
                        <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded border border-purple-500/20 font-bold uppercase tracking-wider font-mono">{(s.level || "Basic").toUpperCase()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-600 py-4 text-center">No skills added yet.</p>
                  )}
                </div>
              </div>

              {/* LEARNING */}
              <div className="bg-white/[0.02] border border-cyan-500/25 rounded-2xl p-6 space-y-5 shadow-lg relative">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold tracking-wide text-zinc-200 flex items-center gap-2"><span className="text-cyan-400">🧠</span> Learning Targets</h3>
                  <button onClick={() => triggerEditWizard("learn")} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-600 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-all">✏️ Edit</button>
                </div>
                
                {editType === "learn" && activeTask && (
                  <div className="bg-black border border-cyan-500/50 p-4 rounded-xl space-y-3 shadow-2xl relative z-30">
                    <div className="flex justify-between items-center text-xs font-bold font-mono text-cyan-400">
                      <span>⚙️ TARGET OPERATIONS</span>
                      <button onClick={() => { setActiveTask(null); setEditType(null); }} className="text-zinc-500 hover:text-white">✕</button>
                    </div>
                    {activeTask === "menu" && (
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setActiveTask("add")} className="p-2 bg-white/5 text-[11px] font-bold rounded-lg border border-white/10 text-cyan-300 hover:bg-cyan-950/30 transition-all">+ Add New</button>
                        <button onClick={() => setActiveTask("level")} className="p-2 bg-white/5 text-[11px] font-bold rounded-lg border border-white/10 text-cyan-300 hover:bg-cyan-950/30 transition-all">⚙️ Change Level</button>
                        <button onClick={() => setActiveTask("delete")} className="p-2 bg-white/5 text-[11px] font-bold rounded-lg border border-white/10 text-red-400 hover:bg-red-950/20 transition-all">💥 Delete</button>
                      </div>
                    )}
                    {activeTask === "add" && (
                      <div className="space-y-2">
                        <input type="text" placeholder="Target skill name" value={inputSkill} onChange={e => setInputSkill(e.target.value)} className="w-full bg-zinc-950 border border-cyan-500/40 rounded-lg p-2 text-xs outline-none focus:border-cyan-400 text-white" />
                        <div className="flex gap-2">
                          <select value={inputLevel} onChange={e => setInputLevel(e.target.value)} className="flex-1 bg-zinc-950 border border-cyan-500/40 rounded-lg p-2 text-xs text-cyan-300 outline-none">
                            <option>Basic</option>
                            <option>Intermediate</option>
                            <option>Advance</option>
                          </select>
                          <button onClick={() => { const u = [...myLearn, { skill: inputSkill.trim(), level: inputLevel }]; handlePersistSkills(u, "learn"); }} disabled={loading || !inputSkill.trim()} className="px-4 bg-cyan-600 hover:bg-cyan-500 text-xs font-bold rounded-lg transition-all">{loading ? "Saving..." : "Add"}</button>
                        </div>
                      </div>
                    )}
                    {activeTask === "level" && (
                      <div className="space-y-2">
                        <select onChange={e => setSelectedSkillIndex(Number(e.target.value))} value={selectedSkillIndex} className="w-full bg-zinc-950 border border-cyan-500/40 rounded-lg p-2 text-xs text-white">
                          <option value={-1}>-- Select target --</option>
                          {myLearn.map((s, i) => <option key={i} value={i}>{s.skill} ({s.level})</option>)}
                        </select>
                        {selectedSkillIndex >= 0 && (
                          <div className="flex gap-2">
                            <select value={inputLevel} onChange={e => setInputLevel(e.target.value)} className="flex-1 bg-zinc-950 border border-cyan-500/40 rounded-lg p-2 text-xs text-cyan-300">
                              <option>Basic</option>
                              <option>Intermediate</option>
                              <option>Advance</option>
                            </select>
                            <button onClick={() => { const u = [...myLearn]; u[selectedSkillIndex].level = inputLevel; handlePersistSkills(u, "learn"); }} className="px-4 bg-cyan-600 text-xs font-bold rounded-lg">Update</button>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTask === "delete" && (
                      <div className="space-y-2">
                        <select onChange={e => setSelectedSkillIndex(Number(e.target.value))} value={selectedSkillIndex} className="w-full bg-zinc-950 border border-red-500/40 rounded-lg p-2 text-xs text-white">
                          <option value={-1}>-- Select Target to Delete --</option>
                          {myLearn.map((s, i) => <option key={i} value={i}>{s.skill}</option>)}
                        </select>
                        {selectedSkillIndex >= 0 && (
                          <button onClick={() => { const u = myLearn.filter((_, i) => i !== selectedSkillIndex); handlePersistSkills(u, "learn"); }} className="w-full py-2 bg-red-600 text-xs font-bold rounded-lg text-white">Confirm Delete</button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {myLearn.length > 0 ? (
                    myLearn.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white/[0.02] border border-white/10 p-4 rounded-xl group hover:border-cyan-500/30 transition-all">
                        <span className="text-sm font-semibold text-zinc-200">{s.skill}</span>
                        <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2.5 py-1 rounded border border-cyan-500/20 font-bold uppercase tracking-wider font-mono">{(s.level || "Basic").toUpperCase()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-600 py-4 text-center">No learning targets yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CREDENTIAL PASSPORT ── */}
        {activeTab === "passport" && <CredentialPassport user={{ ...user, credits }} />}

        {/* ── SESSIONS WITH INJECTED FEEDBACK NAVIGATION ── */}
        {activeTab === "sessions" && (
          <SessionsTab
            user={{ id: user.id, name: user.name, skillsToTeach: user.skillsToTeach }}
            onNavigateToFeedback={() => setActiveTab("feedback")}
          />
        )}

        {/* ── ACHIEVEMENTS ── */}
        {activeTab === "achievements" && <AchievementsTab userId={user.id} />}

        {/* ── MATCHMAKING ── */}
        {activeTab === "matchmaking" && (
          <div className="space-y-6 max-w-5xl animate-fadeIn relative">
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">✨ Find Your Match</h3>
                <p className="text-xs text-zinc-400">Narrow down matches by skill.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-1.5 font-bold">🧠 Skill You Want to Learn</label>
                  <select value={learnFilter} onChange={(e) => setLearnFilter(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-cyan-500/50 font-mono">
                    <option value="None">None</option>
                    {myLearn.map((s, idx) => <option key={idx} value={s.skill}>{s.skill}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-purple-400 mb-1.5 font-bold">⚔️ Skill You Want to Teach</label>
                  <select value={teachFilter} onChange={(e) => setTeachFilter(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-purple-500/50 font-mono">
                    <option value="None">None</option>
                    {myTeach.map((s, idx) => <option key={idx} value={s.skill}>{s.skill}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={executeMatchingPipeline} disabled={loadingMatches} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all">
                  {loadingMatches ? "Searching..." : "🔍 Find Matches"}
                </button>
              </div>
            </div>

            {matchError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono p-4 rounded-xl">{matchError}</div>
            )}

            {loadingMatches ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 font-mono tracking-widest animate-pulse">Looking for great matches...</p>
              </div>
            ) : aiMatches.length === 0 ? (
              <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
                <span className="text-3xl">📡</span>
                <h4 className="text-sm font-bold text-zinc-400 mt-2">No Matches Yet</h4>
                <p className="text-xs text-zinc-600 font-mono mt-1 max-w-sm mx-auto">Try adding more skills to your profile or clearing your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {aiMatches.map((match) => (
                  <div key={match.id} className="bg-gradient-to-br from-white/[0.02] to-transparent border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/30 transition-all relative overflow-hidden group">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-zinc-100">{match.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-mono">{match.school || "No School Listed"} • Grade {match.classYear || "XII"}</p>
                        </div>
                        <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">{match.matchScore}% Match</span>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div>
  <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400 block font-bold">🎁 You'll absorb from them:</span>
  <div className="flex flex-wrap gap-1.5 mt-1">
    {match.canLearn.map((s: any, i: number) => <span key={i} className="text-[10px] bg-purple-500/5 text-purple-300 border border-purple-500/10 px-2 py-0.5 rounded font-mono">{s.skill}</span>)}
  </div>
</div>
<div>
  <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 block font-bold">🚀 You'll inject into them:</span>
  <div className="flex flex-wrap gap-1.5 mt-1">
    {match.canTeach.map((s: any, i: number) => <span key={i} className="text-[10px] bg-cyan-500/5 text-cyan-300 border border-cyan-500/10 px-2 py-0.5 rounded font-mono">{s.skill}</span>)}
  </div>
</div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/5 flex gap-2">
                      <button onClick={() => setSelectedMatch(match)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono font-bold rounded-xl transition-all border border-white/5">👁️ View Profile</button>
                      
                      <button 
                        onClick={() => { 
                          setChatTargetUserId(match.id); 
                          setSelectedMatch(null); 
                          setActiveTab("messages"); 
                        }} 
                        className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs font-mono tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(147,51,234,0.2)]"
                      >
                        💬 Start Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PEER EXPANDED MODAL DETAILED VIEW */}
{selectedMatch && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
    <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">
      <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">

        {/* 1. CORE PROFILE HEADER */}
        <div className="flex justify-between items-start border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-lg font-black shadow-[0_0_15px_rgba(147,51,234,0.3)]">{selectedMatch.name.charAt(0)}</div>
            <div>
              <h3 className="text-lg font-black text-white">{selectedMatch.name}</h3>
              <p className="text-xs text-zinc-500 font-mono">{selectedMatch.school} • {selectedMatch.classYear} • Age {selectedMatch.age || "N/A"}</p>
              <p className="text-xs text-zinc-500 font-mono">📍 {selectedMatch.location}</p>
            </div>
          </div>
          <button onClick={() => setSelectedMatch(null)} className="text-zinc-500 hover:text-white text-sm">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
            <span className="text-zinc-500 block text-[10px] tracking-wider uppercase mb-0.5">Their Credits</span>
            <span className="font-bold text-emerald-300">⚡ {selectedMatch.credits}</span>
          </div>
          <div className="bg-black/40 p-3 rounded-xl border border-white/5">
            <span className="text-zinc-500 block text-[10px] tracking-wider uppercase mb-0.5">Match Score</span>
            <span className="font-bold text-cyan-300">{selectedMatch.matchScore}%</span>
          </div>
        </div>

        {/* 2. ISOLATED EXCHANGE GRID */}
        <div className="space-y-2">
          <h5 className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400">🔄 What You'll Exchange</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-purple-950/10 border border-purple-500/20 p-4 rounded-xl space-y-2">
              <h6 className="text-[10px] font-mono font-bold uppercase text-purple-400">🎁 What you'll learn</h6>
              {selectedMatch.canLearn.length > 0 ? selectedMatch.canLearn.map((c: any, i: number) => (
                <div key={i} className="bg-black/40 rounded-lg p-2 text-xs font-mono">
                  <span className="text-purple-200 font-bold">{c.skill}</span>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Their level: <span className="text-purple-300">{c.theirLevel}</span> → Your level: <span className="text-zinc-300">{c.myLevel}</span>
                  </div>
                </div>
              )) : <p className="text-[11px] text-zinc-600 italic">No direct match</p>}
            </div>
            <div className="bg-cyan-950/10 border border-cyan-500/20 p-4 rounded-xl space-y-2">
              <h6 className="text-[10px] font-mono font-bold uppercase text-cyan-400">🚀 What you'll teach</h6>
              {selectedMatch.canTeach.length > 0 ? selectedMatch.canTeach.map((c: any, i: number) => (
                <div key={i} className="bg-black/40 rounded-lg p-2 text-xs font-mono">
                  <span className="text-cyan-200 font-bold">{c.skill}</span>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    Your level: <span className="text-cyan-300">{c.myLevel}</span> → Their level: <span className="text-zinc-300">{c.theirLevel}</span>
                  </div>
                </div>
              )) : <p className="text-[11px] text-zinc-600 italic">No direct match</p>}
            </div>
          </div>
        </div>

        {/* 3. ALGORITHMIC BREAKDOWN MATRIX */}
        <div className="space-y-2 bg-black/20 border border-white/5 p-4 rounded-xl">
          <h5 className="text-[10px] font-mono font-bold tracking-widest uppercase text-yellow-400">📊 Why This Match Works</h5>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Skill Match (35%)</span>
              <span className="font-bold text-purple-300">{selectedMatch.breakdown.intersection.value}/35</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono pl-2 border-l border-white/10">{selectedMatch.breakdown.intersection.type}</div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Experience Level Fit (20%)</span>
              <span className="font-bold text-cyan-300">{selectedMatch.breakdown.levelDelta.value}/20</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono pl-2 border-l border-white/10">
              {selectedMatch.breakdown.levelDelta.value >= 18 ? "Perfect skill level match!" :
 selectedMatch.breakdown.levelDelta.value >= 12 ? "They know a bit more than you — great for learning" : "There's a knowledge gap here"}
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Schedule Overlap (20%)</span>
              <span className="font-bold text-emerald-300">{selectedMatch.breakdown.chronoSync.value}/20</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono pl-2 border-l border-white/10">
              {selectedMatch.breakdown.chronoSync.commonDays.length > 0
                ? `Overlap: [${selectedMatch.breakdown.chronoSync.commonDays.join(", ")}] +${selectedMatch.breakdown.chronoSync.value}%`
                : "No overlapping availability days"}
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Teaching Style Fit (15%)</span>
              <span className="font-bold text-yellow-300">{selectedMatch.breakdown.pedagogical.value}/15</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono pl-2 border-l border-white/10">
              You: {selectedMatch.breakdown.pedagogical.myMethod} • Them: {selectedMatch.breakdown.pedagogical.peerMethod}
              {selectedMatch.breakdown.pedagogical.matched ? " — perfect fit!" : " — somewhat compatible"}
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">Reliability Score (10%)</span>
              <span className="font-bold text-pink-300">{selectedMatch.breakdown.creditGravity.value}/10</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono pl-2 border-l border-white/10">
              Peer balance: ⚡ {selectedMatch.breakdown.creditGravity.peerCredits} — shows they're active and reliable
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
            <span className="text-xs font-mono font-bold text-zinc-300">OVERALL MATCH</span>
            <span className="text-lg font-black font-mono text-white">{selectedMatch.matchScore}%</span>
          </div>
        </div>

        {/* AVAILABILITY */}
        <div className="space-y-2 bg-black/20 border border-white/5 p-4 rounded-xl">
          <h5 className="text-[10px] font-mono font-bold tracking-widest uppercase text-cyan-400">📅 Their Free Days</h5>
          <div className="flex flex-wrap gap-1.5">
            {parseJSON(selectedMatch.preferredDays).length > 0 ? (
              parseJSON(selectedMatch.preferredDays).map((d: string, i: number) => <span key={i} className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded">{d}</span>)
            ) : (
              <span className="text-xs font-mono text-zinc-600 italic">No availability set yet.</span>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setChatTargetUserId(selectedMatch.id);
            setSelectedMatch(null);
            setActiveTab("messages");
          }}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs font-mono tracking-widest uppercase transition-all shadow-lg"
        >
          💬 Start Chat
        </button>
      </div>
    </div>
  </div>
)}
          </div>
        )}

        {activeTab === "messages" && (
  <MessagesTab user={{ id: user.id, name: user.name }} initialSelectedUserId={chatTargetUserId} />
)}

        {activeTab === "feedback" && (
  <FeedbackTab user={{ id: user.id, name: user.name }} />
)}

        {/* ── MY PROFILE HUB ── */}
        {activeTab === "profile" && (
          <div className="space-y-6 max-w-5xl animate-fadeIn">
            <div className="flex justify-between items-center bg-white/[0.01] border border-white/10 p-5 rounded-2xl">
              <div>
                <h3 className="text-base font-bold text-white">👤 My Profile</h3>
                <p className="text-xs text-zinc-500">Update your info anytime.</p>
              </div>
              {!isEditingProfile && (
                <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 bg-purple-500/10 hover:bg-purple-600 border border-purple-500/40 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all">✏️ Edit Profile</button>
              )}
            </div>

            {profileSaved && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono p-4 rounded-xl">✓ Profile updated!</div>
            )}

            {isEditingProfile ? (
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Full Name</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/40" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">School / College</label>
                    <input type="text" value={profileForm.school} onChange={e => setProfileForm({ ...profileForm, school: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/40" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Grade / Year</label>
                    <select value={profileForm.classYear} onChange={e => setProfileForm({ ...profileForm, classYear: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/40 font-mono">
                      <option>XI</option>
                      <option>XII</option>
                      <option>Undergrad First Year</option>
                      <option>Undergrad Second Year</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Age</label>
                    <input type="number" value={profileForm.age} onChange={e => setProfileForm({ ...profileForm, age: Number(e.target.value) })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/40 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Location</label>
                    <input type="text" value={profileForm.location} onChange={e => setProfileForm({ ...profileForm, location: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/40" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Learning Style</label>
                    <select value={profileForm.teachingMethod} onChange={e => setProfileForm({ ...profileForm, teachingMethod: e.target.value })} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/40 font-mono">
                      {LEARNING_METHODS.map((m, i) => <option key={i} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">Days You're Usually Free</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_DAYS.map((day) => {
                      const active = profileForm.preferredDays.includes(day);
                      return (
                        <button key={day} onClick={() => toggleDay(day)} className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${active ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold" : "bg-black border-white/5 text-zinc-500 hover:text-white"}`}>{day}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                  <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-white/5 text-zinc-400 text-xs font-mono font-bold rounded-xl border border-white/5">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={savingProfile} className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-md">{savingProfile ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Name", value: profileForm.name || user.name },
                    { label: "School", value: profileForm.school || user.school || "Not set" },
                    { label: "Grade", value: profileForm.classYear || user.classYear },
                    { label: "Age", value: `${profileForm.age || user.age} Years Old` },
                    { label: "Location", value: profileForm.location || "Not set" },
                    { label: "Learning Style", value: profileForm.teachingMethod || "Hybrid", green: true },
                    { label: "Email", value: user.email },
                  ].map((field) => (
                    <div key={field.label} className="bg-black/40 border border-white/5 p-4 rounded-xl">
                      <span className="text-zinc-500 block text-[10px] tracking-wider uppercase mb-1">{field.label}</span>
                      <span className={`font-bold text-sm ${(field as any).green ? "text-emerald-400" : "text-zinc-200"}`}>{field.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-xs">
                  <span className="text-zinc-500 block text-[10px] tracking-wider uppercase mb-2">📅 Your Free Days</span>
                  {profileForm.preferredDays.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profileForm.preferredDays.map(day => (
                        <span key={day} className="text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-lg">{day}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-600 italic">No days set yet — edit your profile to add some!</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <SlyxChat userId={user.id} open={slyxOpen} onClose={() => setSlyxOpen(false)} />
    </div>
  );
}