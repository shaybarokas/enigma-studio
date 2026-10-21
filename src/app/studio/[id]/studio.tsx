"use client";

import { useState } from "react";
import type { Kit, ChatMessage, KitConcept } from "@/lib/kits";
import { Chat } from "./chat";
import { Canvas } from "./canvas";

// The studio: the agent's chat on one side, the kit taking shape on the other.
export function Studio({ initial }: { initial: Kit }) {
  const [kit, setKit] = useState(initial);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"chat" | "kit">(initial.status === "interview" ? "chat" : "kit");

  const post = async (path: string, body?: BodyInit, json = true) => {
    const res = await fetch(`/api/kits/${kit.id}${path}`, {
      method: "POST",
      body,
      headers: json && body ? { "Content-Type": "application/json" } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "משהו השתבש. נסו שוב.");
    return data;
  };

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setError("");
    setSending(true);
    const mine: ChatMessage = { role: "user", text };
    setKit((k) => ({ ...k, messages: [...k.messages, mine] }));
    try {
      const d = await post("/chat", JSON.stringify({ text }));
      setKit((k) => ({
        ...k,
        messages: [...k.messages, d.reply],
        brief: d.brief,
        ready: d.ready || k.ready,
        title: d.title ?? k.title,
      }));
    } catch (e) {
      setError((e as Error).message);
      setKit((k) => ({ ...k, messages: k.messages.slice(0, -1) }));
    } finally {
      setSending(false);
    }
  };

  const upload = async (file: File) => {
    setError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const d = await post("/photo", fd, false);
      setKit((k) => ({
        ...k,
        subject: d.subject,
        concepts: k.concepts?.map((c) => ({ ...c, design: { ...c.design, assets: { ...c.design.assets, subject: d.subject } } })) ?? null,
        design: k.design ? { ...k.design, assets: { ...k.design.assets, subject: d.subject } } : null,
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const generate = async () => {
    setError("");
    setGenerating(true);
    setTab("kit");
    try {
      const d = (await post("/concepts")) as { concepts: KitConcept[] };
      setKit((k) => ({ ...k, concepts: d.concepts, status: "concepts", chosen: null, design: null }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const choose = async (index: number) => {
    setError("");
    try {
      const d = await post("/choose", JSON.stringify({ index }));
      setKit((k) => ({ ...k, chosen: index, design: d.design, status: "ready" }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const reopenConcepts = () => setKit((k) => ({ ...k, status: "concepts" }));

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Phone: one panel at a time. */}
      <div className="flex border-b border-border lg:hidden" role="tablist">
        {(["chat", "kit"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold transition ${tab === t ? "border-b-2 border-brand text-brand" : "text-muted"}`}
          >
            {t === "chat" ? "שיחה עם הסוכן" : "הערכה"}
          </button>
        ))}
      </div>

      <aside
        className={`${tab === "chat" ? "flex" : "hidden"} h-[calc(100dvh-7rem)] flex-col border-border lg:sticky lg:top-14 lg:flex lg:h-[calc(100dvh-3.5rem)] lg:w-[420px] lg:shrink-0 lg:border-l`}
      >
        <Chat
          messages={kit.messages}
          sending={sending}
          uploading={uploading}
          ready={kit.ready}
          hasConcepts={!!kit.concepts}
          generating={generating}
          onSend={send}
          onUpload={upload}
          onGenerate={generate}
        />
      </aside>

      <section className={`${tab === "kit" ? "block" : "hidden"} min-w-0 flex-1 lg:block`}>
        {error && (
          <div role="alert" className="mx-4 mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger lg:mx-8">
            {error}
          </div>
        )}
        <Canvas
          kit={kit}
          generating={generating}
          uploading={uploading}
          onGenerate={generate}
          onUpload={upload}
          onChoose={choose}
          onReopenConcepts={reopenConcepts}
        />
      </section>
    </div>
  );
}
