// Hebrew words whose unvowelled spelling has more than one common reading. The narration never
// uses them: the voice cannot be trusted to pick the right one, and niqqud doesn't fix it.
const WORDS = [
  "ספר", "ספרים", "ספרה", "ספרות", "מספר", "מספרים", "מספרת", "סיפר",
  "חלק", "חלקים", "שמע", "בקר", "עבר", "דבר", "דברים", "כתב", "קרא", "ספק", "קשר",
  "שמן", "חלב", "מורה", "מורים", "צלם", "פרח", "ברך", "כבש", "חרש", "נשק", "למד", "מחשב",
  "מכר", "מלך", "בגד", "חסר", "שבר", "פתח", "חשב",
];
const HARD = new Set(WORDS);
// Words that contain a listed one after a prefix-like letter but read only one way.
const SAFE = new Set(["מספרה", "מספרות", "מחלקה", "מחלקות", "משמעות", "מכתב", "מכתבים", "משבר", "מפתח", "מחשבה", "מחשבות", "מבקר", "מעבר", "מדבר"]);

const PREFIXES = ["ו", "ה", "ב", "ל", "כ", "מ", "ש", "וה", "וב", "ול", "וכ", "ומ", "וש", "שה", "שב", "של", "מה", "כש", "וכש"];

const clean = (w: string) => w.replace(/[֑-ׇ.,!?:;"'״׳()\-–…]/g, "");

/** The ambiguous words in a line (with or without prefixes like ו/ה/ב/ל/ש). */
export function ambiguousWords(line: string): string[] {
  const found = new Set<string>();
  for (const raw of line.split(/\s+/)) {
    const w = clean(raw);
    if (!w) continue;
    if (SAFE.has(w) || PREFIXES.some((p) => w.startsWith(p) && SAFE.has(w.slice(p.length)))) continue;
    if (HARD.has(w)) found.add(w);
    for (const p of PREFIXES) if (w.startsWith(p) && HARD.has(w.slice(p.length))) found.add(w);
  }
  return [...found];
}
