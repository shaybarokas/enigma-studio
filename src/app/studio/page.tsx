import Link from "next/link";
import { Suspense } from "react";
import { listKits } from "@/lib/kits";
import { NewKitButton } from "./new-kit-button";
import { KitCover } from "./kit-cover";

export const metadata = { title: "הערכות שלי | Enigma Studio" };

const STATUS = { interview: "בשיחה עם הסוכן", concepts: "ממתין לבחירת כיוון", ready: "מוכן" } as const;

export default function StudioHome() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-20 text-muted">טוען…</div>}>
      <Kits />
    </Suspense>
  );
}

async function Kits() {
  const kits = await listKits();
  if (kits.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <h1 className="text-3xl font-black sm:text-5xl">
          מה <span className="text-brand">משיקים</span> היום?
        </h1>
        <p className="max-w-lg text-lg text-muted">
          כמה דקות של שיחה עם הסוכן, ומקבלים ערכת השקה שלמה: גרפיקות ומודעות מרהיבות בכל הגדלים, בקו עיצובי אחד.
        </p>
        <NewKitButton big />
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black">הערכות שלי</h1>
        <NewKitButton />
      </div>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {kits.map((k) => (
          <li key={k.id}>
            <Link
              href={`/studio/${k.id}`}
              className="group block overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-brand hover:shadow-xl hover:shadow-brand/10"
            >
              <KitCover kit={k} />
              <div className="p-4">
                <p className="truncate font-bold">{k.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {STATUS[k.status]} · {new Date(k.updated_at).toLocaleDateString("he-IL")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
