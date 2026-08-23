"use client";

import { useState, useRef, useEffect } from "react";

export interface SlyxChatProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  contextData?: {
    user?: any;
    skillsToTeach?: any[];
    skillsToLearn?: any[];
    credits?: number;
    portfolioScore?: any;
  };
}

export default function SlyxChat({
  userId,
  open,
  onClose,
  contextData,
}: SlyxChatProps) {
  const [messages, setMessages] = useState<
    { role: "user" | "model"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const updatedHistory = [
      ...messages,
      { role: "user" as const, text: userMsg },
    ];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const res = await fetch("/api/slyx-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          message: userMsg,
          history: messages,
          contextData, // Context sent to backend API
        }),
      });

      const data = await res.json();
      if (data.error) {
        console.error("SLYX error:", data.error);
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: "Hmm, something went wrong on my end. Mind trying again?",
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
      }
    } catch (err) {
      console.error("SLYX fetch error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "I couldn't connect just now. Try again in a moment!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] h-[480px] bg-zinc-950 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border-b border-white/10 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦊</span>
          <div>
            <h4 className="text-sm font-bold text-white">SLYX</h4>
            <p className="text-[10px] text-zinc-400 font-mono">Your study buddy</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs text-zinc-300 max-w-[85%]">
            Hey! 🦊 I can see your real dashboard data — ask me about your
            credits, skills, credentials, or sessions!
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white rounded-br-sm"
                  : "bg-white/[0.03] border border-white/10 text-zinc-200 rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs text-zinc-400 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/5 flex gap-2">
        <input
          type="text"
          placeholder="Ask SLYX anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-bold rounded-xl transition-all"
        >
          ➤
        </button>
      </div>
    </div>
  );
}