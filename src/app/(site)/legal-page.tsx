import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

// Shared frame for the legal documents: readable width, numbered sections, contact line.
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 md:px-8">
      <p className="text-sm font-semibold text-brand" dir="ltr">
        {SITE.name}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">עדכון אחרון: {SITE.legalUpdated}</p>
      <div className="mt-6 text-base leading-relaxed text-muted">{intro}</div>
      <div className="mt-10 flex flex-col gap-8 leading-relaxed [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-extrabold [&_li]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pr-5">{children}</div>
      <p className="mt-12 rounded-2xl border border-border bg-surface p-5 text-sm">
        לשאלות ופניות: {SITE.operator}, {SITE.operatorType} ·{" "}
        <a href={`mailto:${SITE.contactEmail}`} dir="ltr" className="font-bold text-brand hover:underline">
          {SITE.contactEmail}
        </a>
      </p>
    </main>
  );
}
