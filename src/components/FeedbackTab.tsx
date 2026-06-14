"use client";

import { useState, useEffect } from "react";
import { getUserFeedback, getUserSessions, submitFeedback, getSessionFeedbackStatus } from "@/actions/credentials";

interface FeedbackTabProps {
  user: { id: string; name: string };
}

const FEEDBACK_QUESTIONS = [
  { key: "punctuality", label: "Punctuality", desc: "Was the session started and ended on time?" },
  { key: "teachingQuality", label: "Teaching Quality", desc: "How clearly were concepts explained?" },
  { key: "contentQuality", label: "Content Quality", desc: "Was the material relevant and well-prepared?" },
  { key: "communication", label: "Communication", desc: "How was the overall communication?" },
  { key: "patience", label: "Patience", desc: "Were questions and doubts handled patiently?" },
  { key: "preparedness", label: "Preparedness", desc: "Did they seem prepared for the session?" },
  { key: "professionalism", label: "Professionalism", desc: "Overall conduct and professionalism" },
  { key: "overallExperience", label: "Overall Experience", desc: "How was your overall experience?" },
];

export default function FeedbackTab({ user }: FeedbackTabProps) {
  const [activeView, setActiveView] = useState<"pending" | "received" | "given">("pending");
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [given, setGiven] = useState<any[]>([]);
  const [feedbackTargetSession, setFeedbackTargetSession] = useState<any | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionData, feedbackData] = await Promise.all([
        getUserSessions(user.id),
        getUserFeedback(user.id),
      ]);
      setSessions(sessionData);
      setReceived(feedbackData.received);
      setGiven(feedbackData.given);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sessions where the time slot has ended and feedback hasn't been given by this user
  const getPendingFeedbackSessions = () => {
  const now = new Date();
  return sessions.filter((s) => {
    const sessionEnd = new Date(s.scheduledAt);
    sessionEnd.setHours(sessionEnd.getHours() + 1);
    const isPast = now >= sessionEnd;
    const isLearnerInSession = s.learnerId === user.id;
    const alreadyGiven = s.feedbacks?.some((f: any) => f.giverId === user.id);
    const wasConfirmedOrCompleted = s.status === "confirmed" || s.status === "completed";
    return isPast && isLearnerInSession && wasConfirmedOrCompleted && !alreadyGiven;
  });
};

  const openFeedbackForm = (session: any) => {
    setFeedbackTargetSession(session);
    setRatings(FEEDBACK_QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: 0 }), {}));
    setReview("");
  };

  const handleSubmit = async () => {
    if (!feedbackTargetSession) return;
    const allRated = FEEDBACK_QUESTIONS.every(q => ratings[q.key] > 0);
    if (!allRated) {
      alert("Please rate all categories before submitting.");
      return;
    }
    if (!review.trim()) {
      alert("Please write a short review.");
      return;
    }

    setSubmitting(true);
    try {
      const amLearner = feedbackTargetSession.learnerId === user.id;
      const receiverId = amLearner ? feedbackTargetSession.teacherId : feedbackTargetSession.learnerId;
      const giverRole: "teacher" | "learner" = amLearner ? "learner" : "teacher";

      const res = await submitFeedback({
        sessionId: feedbackTargetSession.id,
        giverId: user.id,
        receiverId,
        giverRole,
        ratings,
        review: review.trim(),
      });

      if (res.error) {
        alert(res.error);
      } else {
        setFeedbackTargetSession(null);
        await loadData();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (key: string) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRatings(prev => ({ ...prev, [key]: star }))}
          className={`text-2xl transition-all ${
            (ratings[key] || 0) >= star ? "text-yellow-400" : "text-zinc-700 hover:text-zinc-500"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );

  const avgRating = (fb: any) => {
    const sum = FEEDBACK_QUESTIONS.reduce((acc, q) => acc + (fb[q.key] || 0), 0);
    return (sum / FEEDBACK_QUESTIONS.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // FEEDBACK FORM
  if (feedbackTargetSession) {
    const amLearner = feedbackTargetSession.learnerId === user.id;
    const otherPersonName = amLearner ? feedbackTargetSession.teacher?.name : feedbackTargetSession.learner?.name;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div className="flex items-center gap-3">
          <button onClick={() => setFeedbackTargetSession(null)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">←</button>
          <div>
            <h2 className="text-lg font-black text-white">Session Feedback</h2>
            <p className="text-xs text-zinc-500 font-mono">
              {feedbackTargetSession.skill} • {amLearner ? `Teacher: ${otherPersonName}` : `Learner: ${otherPersonName}`}
            </p>
          </div>
        </div>

        <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-3 text-[11px] font-mono text-yellow-400/80">
          Once submitted, this can't be changed — so take your time!
        </div>

        <div className="space-y-4">
          {FEEDBACK_QUESTIONS.map((q) => (
            <div key={q.key} className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white">{q.label}</h4>
                <p className="text-[11px] text-zinc-500 font-mono">{q.desc}</p>
              </div>
              {renderStars(q.key)}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Written Review *</label>
          <textarea
            placeholder="Share your experience..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 font-mono resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-bold font-mono uppercase tracking-widest rounded-xl transition-all"
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </div>
    );
  }

  const pendingSessions = getPendingFeedbackSessions();

  return (
    <div className="space-y-6 max-w-5xl animate-fadeIn">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">⭐ Feedback</h2>
        <p className="text-xs text-zinc-500 font-mono mt-0.5">Share how your sessions went</p>
      </div>

      <div className="flex gap-2 bg-black/40 border border-white/10 rounded-xl p-1.5 w-fit">
        {[
          { id: "pending", label: `⏳ Pending (${pendingSessions.length})` },
          { id: "received", label: `📥 Received (${received.length})` },
          { id: "given", label: `📤 Given (${given.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
              activeView === tab.id ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === "pending" && (
        pendingSessions.length === 0 ? (
          <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-sm font-bold text-zinc-300 mb-2">No Pending Feedback</h3>
            <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">
              Once a session is over, you'll be able to rate it here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSessions.map((s) => {
              const amLearner = s.learnerId === user.id;
              return (
                <div key={s.id} className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-sm font-black text-white">{s.skill}</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      {amLearner ? `Teacher: ${s.teacher?.name}` : `Learner: ${s.learner?.name}`}
                      {" • "}
                      {new Date(s.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <button
                    onClick={() => openFeedbackForm(s)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold font-mono rounded-xl transition-all"
                  >
                    ⭐ Give Feedback
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {activeView === "received" && (
        received.length === 0 ? (
          <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <p className="text-xs text-zinc-500 font-mono">No feedback received yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {received.map((fb) => (
              <div key={fb.id} className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">
                      {fb.giver?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{fb.giver?.name}</h4>
                      <p className="text-[11px] text-zinc-500 font-mono">{fb.session?.skill}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-yellow-400">★ {avgRating(fb)}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed italic">"{fb.review}"</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/5">
                  {FEEDBACK_QUESTIONS.map(q => (
                    <div key={q.key} className="text-[10px] font-mono text-zinc-500">
                      {q.label}: <span className="text-yellow-400 font-bold">{fb[q.key]}★</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeView === "given" && (
        given.length === 0 ? (
          <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <p className="text-xs text-zinc-500 font-mono">You haven't given feedback yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {given.map((fb) => (
              <div key={fb.id} className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-300">
                      {fb.receiver?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{fb.receiver?.name}</h4>
                      <p className="text-[11px] text-zinc-500 font-mono">{fb.session?.skill}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono text-yellow-400">★ {avgRating(fb)}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed italic">"{fb.review}"</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}