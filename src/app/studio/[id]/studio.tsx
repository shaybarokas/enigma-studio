"use client";

import { useState } from "react";
import type { Kit, ChatMessage, KitConcept } from "@/lib/kits";
import { Chat } from "./chat";
import { Canvas } from "./canvas";
import { Paywalled, paywalled } from "@/components/account";
import type { MediaRole } from "@/lib/agent/media-names";
import { uploadKitImages } from "@/lib/upload-images";

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
    if (paywalled(res, data)) throw new Paywalled();
    if (!res.ok) throw new Error(data.error ?? "משהו השתבש. נסו שוב.");
    return data;
  };

  const send = async (text: string, images: File[] = []) => {
    if (images.length) return sendMedia(text, images);
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
        brief: d.brief ?? k.brief,
        ready: d.ready || k.ready,
        title: d.title ?? k.title,
        design: d.design ?? k.design,
        // A photo picked in the chat ("use the colour one") lands in the designs.
        media: d.media ?? k.media,
        subject: d.subject ?? k.subject,
        concepts: d.concepts ?? k.concepts,
      }));
    } catch (e) {
      if (!(e instanceof Paywalled)) setError((e as Error).message);
      setKit((k) => ({ ...k, messages: k.messages.slice(0, -1) }));
    } finally {
      setSending(false);
    }
  };

  // Images (with an optional line of text): stored, recognised and put to work; the agent answers.
  // `role` forces what they are (e.g. "replace the lecturer photo" from the brief panel).
  const sendMedia = async (text: string, images: File[], role?: MediaRole) => {
    setError("");
    setUploading(true);
    setSending(true);
    try {
      const paths = await uploadKitImages(kit.id, images);
      const d = await post("/media", JSON.stringify({ paths, text, role }));
      setKit((k) => ({
        ...k,
        media: d.media,
        subject: d.subject ?? k.subject,
        concepts: d.concepts ?? k.concepts,
        design: d.design ?? k.design,
        brief: d.brief ?? k.brief,
        ready: d.ready || k.ready,
        messages: [...k.messages, d.userMsg, d.reply],
      }));
    } catch (e) {
      if (!(e instanceof Paywalled)) setError((e as Error).message);
    } finally {
      setUploading(false);
      setSending(false);
    }
  };

  // Corrections to what an image is, and removals, from the materials panel.
  const editMedia = async (mediaId: string, change: { role: MediaRole } | { primary: true } | "remove") => {
    setError("");
    setUploading(true);
    try {
      const res = await fetch(`/api/kits/${kit.id}/media${change === "remove" ? `?mediaId=${mediaId}` : ""}`, {
        method: change === "remove" ? "DELETE" : "PATCH",
        headers: change === "remove" ? undefined : { "Content-Type": "application/json" },
        body: change === "remove" ? undefined : JSON.stringify({ mediaId, ...change }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "משהו השתבש");
      setKit((k) => ({ ...k, media: d.media, subject: d.subject, concepts: d.concepts ?? k.concepts, design: d.design ?? k.design, brief: d.brief ?? k.brief }));
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
      if (!(e instanceof Paywalled)) setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const choose = async (index: number) => {
    setError("");
    try {
      const d = await post("/choose", JSON.stringify({ index }));
      setKit((k) => ({ ...k, chosen: index, design: d.design, status: "ready", messages: d.messages ?? k.messages }));
    } catch (e) {
      if (!(e instanceof Paywalled)) setError((e as Error).message);
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
          error={error}
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
          onUpload={(files: File[], role?: MediaRole) => void sendMedia("", files, role)}
          onEditMedia={(mediaId: string, change: { role: MediaRole } | { primary: true } | "remove") => void editMedia(mediaId, change)}
          onChoose={choose}
          onReopenConcepts={reopenConcepts}
          onDesignChange={(design) => setKit((k) => ({ ...k, design }))}
        />
      </section>
    </div>
  );
}
