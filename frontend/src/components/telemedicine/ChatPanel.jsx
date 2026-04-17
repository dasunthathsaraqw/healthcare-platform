"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const rawApiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");
const API_BASE = /\/api$/i.test(normalizedApiBase) ? normalizedApiBase : `${normalizedApiBase}/api`;
const POLL_INTERVAL = 3000; // Poll every 3 seconds

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

function getUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function idsEqual(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
}

export default function ChatPanel({ appointmentId, otherPartyName = "Doctor", className = "" }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState("");
  const [user,     setUser]     = useState(null);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const pollingRef = useRef(null);
  const lastCountRef = useRef(0);

  // Load current user once
  useEffect(() => {
    setUser(getUser());
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!appointmentId) return;
    try {
      const res = await axios.get(
        `${API_BASE}/telemedicine/chat/${appointmentId}`,
        { headers: authHeaders() }
      );
      const msgs = res.data.messages || [];
      setMessages(msgs);
      lastCountRef.current = msgs.length;
      setError("");
    } catch (err) {
      console.error("Chat fetch error:", err);
      setError("Unable to load messages.");
    }
  }, [appointmentId]);

  // Initial load + polling
  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(pollingRef.current);
  }, [fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    // Optimistic UI
    const optimistic = {
      _id: `temp-${Date.now()}`,
      message: text,
      senderId: user?.id || user?._id || "me",
      senderName: user?.name || "You",
      senderRole: user?.role || "patient",
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await axios.post(
        `${API_BASE}/telemedicine/chat/${appointmentId}`,
        { message: text },
        { headers: authHeaders() }
      );
      // Refresh to get server-confirmed message
      await fetchMessages();
    } catch (err) {
      setError("Failed to send. Please try again.");
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setInput(text); // restore input
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const myId = user?.id || user?._id || user?.userId;
  const isMe = (msg) => idsEqual(msg.senderId, myId);

  return (
    <div className={`flex flex-col bg-white ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">Chat</p>
            <p className="text-blue-100 text-[10px]">with {otherPartyName}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-white/70">Live</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 min-h-0">
        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
            <span className="text-3xl mb-2">💬</span>
            <p className="text-sm font-semibold text-gray-600">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-500 text-center py-2 bg-red-50 rounded-lg px-3">{error}</div>
        )}

        {messages.map((msg, i) => {
          const mine = isMe(msg);
          return (
            <div key={msg._id || i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {/* Sender name */}
                {!mine && (
                  <span className="text-[10px] text-gray-400 font-medium px-1">
                    {msg.senderName || otherPartyName}
                    <span className="ml-1 text-[9px] capitalize bg-blue-50 text-blue-500 px-1 rounded">
                      {msg.senderRole}
                    </span>
                  </span>
                )}

                {/* Bubble */}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  mine
                    ? `bg-blue-600 text-white rounded-br-sm ${msg.pending ? "opacity-60" : ""}`
                    : "bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-sm"
                }`}>
                  {msg.message}
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-gray-400 px-1">
                  {fmtTime(msg.createdAt)}
                  {msg.pending && " · Sending..."}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 p-3 border-t border-gray-100 bg-white">
        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-300 transition max-h-24 overflow-y-auto leading-5"
            style={{ minHeight: "38px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-9 h-9 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-colors"
            title="Send message"
          >
            {sending ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            )}
          </button>
        </form>
        <p className="text-[9px] text-gray-300 mt-1 text-right">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
