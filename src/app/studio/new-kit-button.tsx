"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewKitButton({ big = false }: { big?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const create = async () => {
    setPending(true);
    setError("");
    const res = await fetch("/api/kits", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "משהו השתבש");
      setPending(false);
      return;
    }
    router.push(`/studio/${data.id}`);
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={create}
        disabled={pending}
        className={`rounded-full bg-brand font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-strong disabled:opacity-60 ${big ? "px-8 py-4 text-lg" : "px-5 py-2.5"}`}
      >
        {pending ? "פותח..." : "+ ערכת השקה חדשה"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
