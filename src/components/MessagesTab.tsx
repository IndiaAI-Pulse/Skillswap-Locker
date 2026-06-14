"use client";

import { useState, useEffect, useRef } from "react";
import { sendMessage, getConversation, markMessagesRead, getConversationsList } from "@/actions/messages";
import { getConnectedUsers } from "@/actions/profile";

interface MessagesTabProps {
  user: { id: string; name: string };
  initialSelectedUserId?: string | null;
}

export default function MessagesTab({ user, initialSelectedUserId }: MessagesTabProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadConversation(selectedUser.id);
      markMessagesRead(user.id, selectedUser.id);
      const interval = setInterval(() => loadConversation(selectedUser.id, true), 4000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [convos, connected] = await Promise.all([
        getConversationsList(user.id),
        getConnectedUsers(user.id),
      ]);
      setConversations(convos);
      setConnectedUsers(connected);

      if (initialSelectedUserId) {
        const target = connected.find((u: any) => u.id === initialSelectedUserId)
          || convos.find((c: any) => c.user.id === initialSelectedUserId)?.user;
        if (target) setSelectedUser(target);
      } else if (convos.length > 0) {
        setSelectedUser(convos[0].user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (otherUserId: string, silent = false) => {
    try {
      const data = await getConversation(user.id, otherUserId);
      setMessages(data);
      if (!silent) {
        const convos = await getConversationsList(user.id);
        setConversations(convos);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedUser) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      await sendMessage(user.id, selectedUser.id, content);
      await loadConversation(selectedUser.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Combine: people with existing conversations + connected users not yet messaged
  const allContacts = [
    ...conversations.map(c => ({ ...c.user, lastMessage: c.lastMessage, unreadCount: c.unreadCount, lastMessageAt: c.lastMessageAt })),
    ...connectedUsers
      .filter(u => !conversations.some(c => c.user.id === u.id))
      .map(u => ({ ...u, lastMessage: null, unreadCount: 0, lastMessageAt: null })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fadeIn h-[calc(100vh-280px)] min-h-[500px]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">

        {/* CONTACT LIST */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3 overflow-y-auto space-y-1.5">
          <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-zinc-400 px-2 py-2">💬 Conversations</h3>
          {allContacts.length === 0 ? (
            <p className="text-xs text-zinc-600 font-mono text-center py-8 px-2">
              No connections yet. Match with peers via AI Matchmaking to start chatting.
            </p>
          ) : (
            allContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedUser(contact)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                  selectedUser?.id === contact.id
                    ? "bg-purple-500/15 border border-purple-500/40"
                    : "hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                  {contact.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-200 truncate">{contact.name}</p>
                    {contact.unreadCount > 0 && (
                      <span className="text-[9px] bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono truncate">
                    {contact.lastMessage || "Say hello 👋"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* CHAT WINDOW */}
        <div className="md:col-span-2 bg-white/[0.02] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">
                  {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <h4 className="text-sm font-bold text-white">{selectedUser.name}</h4>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-zinc-600 font-mono text-center py-8">
                    No messages yet. Say hello to {selectedUser.name?.split(" ")[0]}!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs ${
                          isMe
                            ? "bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white rounded-br-sm"
                            : "bg-white/[0.05] border border-white/10 text-zinc-200 rounded-bl-sm"
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-[9px] mt-1 font-mono ${isMe ? "text-purple-200/70" : "text-zinc-500"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 font-mono">
              Pick a chat to get started
            </div>
          )}
        </div>
      </div>
    </div>
  );
}