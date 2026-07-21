"use client";

import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; text: string };

function formatMarkdownText(text: string): string {
  if (!text) return "";

  return (
    text
      // 1. Convert literal string "\n" (if n8n sends raw JSON escapes) into real newlines
      .replace(/\\n/g, "\n")

      // 2. Replace non-breaking spaces (\u00A0) from n8n with standard spaces
      .replace(/\u00A0/g, " ")

      // 3. Clean up 3 or more consecutive newlines into 2
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: 'Ask me things like "is it safe to go jogging at 5pm?"',
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {},
      );
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg: Message = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      const payload: any = { message: userMsg.text };
      if (coords) {
        payload.lat = coords.lat;
        payload.lon = coords.lon;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            data.reply ??
            data.message ??
            data.output ??
            "Something went wrong.",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Couldn't reach the assistant — try again shortly.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[650px] flex-col rounded-instrument border border-haze-50 bg-panelRaised shadow-instrument">
      <div className="flex items-center gap-2 border-b border-haze-50 px-4 py-3">
        <MessageCircle size={16} className="text-brand" />
        <span className="font-display text-sm text-ink">Ask AirIntel</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-instrument px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-brand text-white"
                : "bg-panelSunken text-ink"
            }`}
          >
            {m.role === "user" ? (
              m.text
            ) : (
              <div className="prose prose-sm max-w-none text-ink leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {formatMarkdownText(m.text)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex max-w-[85%] gap-1 rounded-instrument bg-panelSunken px-3 py-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-haze-200" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-haze-200 [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-haze-200 [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-haze-50 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about conditions near you…"
          className="flex-1 rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <button
          onClick={send}
          disabled={sending}
          className="rounded-instrument bg-brand px-3 py-2 text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
