import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadKit } from "@/lib/kits";
import { Studio } from "./studio";

export const metadata = { title: "סטודיו | Enigma Studio" };

export default function KitPage({ params }: PageProps<"/studio/[id]">) {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-20 text-muted">פותח את הסטודיו…</div>}>
      <KitLoader params={params} />
    </Suspense>
  );
}

async function KitLoader({ params }: { params: PageProps<"/studio/[id]">["params"] }) {
  const { id } = await params;
  const kit = await loadKit(id);
  if (!kit) notFound();
  return <Studio initial={kit} />;
}
