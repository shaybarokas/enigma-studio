// A price written as a sentence ("₪990 תשלום חד־פעמי, גישה לכל החיים") is read at once only when the
// number stands out: it is split into the amount (big) and the rest (a small line).
export function splitPrice(text: string): { number: string; rest: string } | null {
  const m = text.match(/(₪\s?[\d,.]+|[\d,.]+\s?₪|[\d,.]{2,}\s?(?:ש״ח|שח|שקלים))/);
  if (!m) return null;
  return { number: m[1].replace(/\s+/g, ""), rest: text.replace(m[1], "").replace(/^[\s,·-]+|[\s,·-]+$/g, "").replace(/\s+/g, " ") };
}
