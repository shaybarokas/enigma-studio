// Hebrew, right-to-left, inline-styled emails (mail clients ignore stylesheets), in the studio's
// brand line: charcoal frame, purple accent, pearl card.

export const APP_URL = process.env.APP_URL ?? "https://enigma-studios.co";
export const appUrl = (path: string) => `${APP_URL}${path}`;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const dateHe = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeZone: "Asia/Jerusalem" }).format(new Date(iso)) : "";

export type Mail = { subject: string; heading: string; body: string; button?: { label: string; url: string }; note?: string; footer?: string };

const SERVICE_FOOTER = "נשלח מ־Enigma Studio, הסטודיו שמייצר ערכות השקה עם סוכן AI. זו הודעת שירות על החשבון שלך.";

export function render(m: Mail) {
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(m.subject)}</title></head>
<body style="margin:0;background:#0f0f1a;font-family:Arial,Helvetica,sans-serif;color:#0f0f1a;direction:rtl;text-align:right">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td dir="ltr" style="font-size:20px;font-weight:900;color:#f4f1ff;padding:0 4px 16px;text-align:right">Enigma <span style="color:#a78bfa">Studio</span></td></tr>
<tr><td style="background:#faf8ff;border-radius:20px;padding:32px 28px">
<div style="font-size:24px;font-weight:900;line-height:1.3;padding-bottom:12px">${m.heading}</div>
<div style="font-size:16px;line-height:1.7;color:#3d3b52">${m.body}</div>
${m.button ? `<div style="padding-top:24px"><a href="${esc(m.button.url)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px;font-size:16px">${m.button.label}</a></div>` : ""}
${m.note ? `<div style="font-size:13px;line-height:1.6;color:#6b6880;padding-top:22px;border-top:1px solid #e6e1f5;margin-top:26px">${m.note}</div>` : ""}
</td></tr>
<tr><td style="font-size:12px;color:#8a87a6;padding:16px 4px 0;line-height:1.6">${m.footer ?? SERVICE_FOOTER}</td></tr>
</table></td></tr></table></body></html>`;
  const strip = (s: string) =>
    s
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  const text = [strip(m.heading), "", strip(m.body), m.button ? `\n${m.button.label}: ${m.button.url}` : "", m.note ? `\n${strip(m.note)}` : "", "\n— Enigma Studio", m.footer ? `\n${strip(m.footer)}` : ""].join("\n");
  return { subject: m.subject, html, text };
}

export const hi = (name: string | null) => (name ? `${esc(name.split(" ")[0])}, ` : "");

// ---------- account ----------

export const confirmEmail = (name: string | null, url: string) =>
  render({
    subject: "אישור הכתובת ל־Enigma Studio",
    heading: "עוד לחיצה אחת ואתם בפנים",
    body: `${hi(name)}כדי להפעיל את החשבון ולקבל את 15 הקרדיטים לחודש הראשון, מאשרים שהכתובת הזו שלכם. הקישור תקף ל־24 שעות.`,
    button: { label: "אישור הכתובת וכניסה", url },
    note: "לא נרשמתם ל־Enigma Studio? אפשר להתעלם מהמייל, ושום חשבון לא יופעל.",
  });

export const welcomeEmail = (name: string | null) =>
  render({
    subject: "ברוכים הבאים ל־Enigma Studio",
    heading: `${hi(name)}ברוכים הבאים לסטודיו ✦`,
    body: `החשבון שלך מוכן, ויש בו 15 קרדיטים לחודש הראשון.<br><br>
<strong>איך מתחילים:</strong> פותחים ערכת השקה חדשה ומספרים לסוכן מה משיקים: קורס, סדנה, שירות או מוצר. אפשר להדביק קישור לדף המכירה, והוא ישאל רק את מה שחסר. תוך כמה דקות מקבלים שלושה כיוונים עיצוביים שלמים, בוחרים אחד, ומשם הכול בשליטה שלך.`,
    button: { label: "לפתיחת ערכה ראשונה", url: appUrl("/studio") },
    note: "טיפ: תמונה טובה שלך או של המרצה (רקע לא משנה) עושה את כל ההבדל בגרפיקה.",
  });

export const resetEmail = (name: string | null, url: string) =>
  render({
    subject: "איפוס סיסמה ל־Enigma Studio",
    heading: "איפוס סיסמה",
    body: `${hi(name)}ביקשת לבחור סיסמה חדשה. הלחיצה על הכפתור פותחת עמוד שבו בוחרים אותה. הקישור תקף לשעה אחת ולשימוש אחד.`,
    button: { label: "בחירת סיסמה חדשה", url },
    note: "לא ביקשת? אפשר להתעלם מהמייל. הסיסמה הנוכחית נשארת כמו שהיא.",
  });

export const passwordChangedEmail = (name: string | null) =>
  render({
    subject: "הסיסמה שלך ב־Enigma Studio שונתה",
    heading: "הסיסמה שונתה",
    body: `${hi(name)}הסיסמה לחשבון שלך בסטודיו שונתה הרגע.`,
    note: `השינוי לא היה שלך? <a href="${esc(appUrl("/forgot"))}" style="color:#7c3aed">אפשר לאפס את הסיסמה כאן</a>.`,
  });

// ---------- videos ----------

export const videoEmails = {
  ready: (name: string | null, video: string, kitUrl: string) =>
    render({
      subject: `${video} מוכן ✦`,
      heading: `${video} מוכן`,
      body: `${hi(name)}הסרטון הופק ומחכה לך בערכה, מוכן לצפייה ולהורדה. רוצים לתקן מילה, צבע או הדגשה? כפתור "✂️ עריכה" שליד הסרטון פותח את עורך הסרטון.`,
      button: { label: "לצפייה בסרטון", url: kitUrl },
    }),
  failed: (name: string | null, video: string, kitUrl: string, credits: number) =>
    render({
      subject: `${video} לא הופק, הקרדיטים הוחזרו`,
      heading: "משהו השתבש בהפקה",
      body: `${hi(name)}הפקת ${esc(video)} נעצרה בגלל תקלה אצלנו${credits ? `, ו־${credits} הקרדיטים הוחזרו לחשבון שלך` : ""}. התסריט שמור, ואפשר לנסות שוב מהערכה. אם זה חוזר, נשמח לשמוע בוואטסאפ ונטפל.`,
      button: { label: "חזרה לערכה", url: kitUrl },
    }),
};

// ---------- billing ----------

type Billing = { name: string | null; plan: string; amount?: string; date?: string | null; credits?: number };

const billingPage = { label: "לעמוד המסלול", url: appUrl("/studio/billing") };

export const billingEmails = {
  subscribed: (v: Billing) =>
    render({
      subject: `${v.plan} הופעל`,
      heading: "המסלול הופעל, יוצאים לדרך",
      body: `${hi(v.name)}${esc(v.plan)} פעיל, ונטענו לחשבון ${v.credits} קרדיטים. חויבת ב־${esc(v.amount ?? "")}, וחשבונית מס נשלחה אליך בנפרד.<br><br>החידוש הבא: <strong>${esc(dateHe(v.date))}</strong>. אפשר לבטל בכל רגע מעמוד המסלול, והמסלול ימשיך לעבוד עד סוף התקופה ששולמה.`,
      button: { label: "חזרה לסטודיו", url: appUrl("/studio") },
    }),
  pack: (v: Billing) =>
    render({
      subject: `${v.credits} קרדיטים נוספו לחשבון`,
      heading: "הקרדיטים בפנים ✦",
      body: `${hi(v.name)}${v.credits} קרדיטים נוספו לחשבון שלך (חויבת ב־${esc(v.amount ?? "")}, החשבונית נשלחה בנפרד). קרדיטים מחבילה לא פגים, והם משמשים אחרי המכסה החודשית.`,
      button: { label: "חזרה לסטודיו", url: appUrl("/studio") },
    }),
  renewed: (v: Billing) =>
    render({
      subject: `${v.plan} חודש`,
      heading: "המסלול חודש",
      body: `${hi(v.name)}${esc(v.plan)} חודש בהצלחה וחויבת ב־${esc(v.amount ?? "")}. מכסת הקרדיטים מולאה מחדש, והחשבונית נשלחה בנפרד. החידוש הבא: ${esc(dateHe(v.date))}.`,
      button: billingPage,
    }),
  reminder: (v: Billing) =>
    render({
      subject: `תזכורת: המסלול השנתי מתחדש ב־${dateHe(v.date)}`,
      heading: "המסלול השנתי מתחדש בעוד שבוע",
      body: `${hi(v.name)}רק שיהיה ידוע מראש: ${esc(v.plan)} מתחדש אוטומטית ב־<strong>${esc(dateHe(v.date))}</strong>, בחיוב של ${esc(v.amount ?? "")} בכרטיס השמור. לא צריך לעשות כלום כדי להמשיך.`,
      button: billingPage,
      note: "רוצים לעבור למסלול אחר או לבטל? אפשר מעמוד המסלול עד יום החידוש, בלי עלות.",
    }),
  failed: (v: Billing) =>
    render({
      subject: "החיוב לא עבר: כדאי לעדכן כרטיס",
      heading: "החיוב לא עבר",
      body: `${hi(v.name)}ניסינו לחדש את ${esc(v.plan)} בסך ${esc(v.amount ?? "")}, והכרטיס לא אישר את החיוב. ננסה שוב מחר. אם הכרטיס הוחלף או פג תוקפו, אפשר לחדש את המסלול בכרטיס אחר מעמוד המסלול.`,
      button: billingPage,
    }),
  downgraded: (v: Billing) =>
    render({
      subject: "עברת למסלול החינמי",
      heading: "המסלול הסתיים",
      body: `${hi(v.name)}לא הצלחנו לחייב את הכרטיס אחרי כמה ניסיונות, ולכן החשבון עבר למסלול החינמי. כל הערכות שלך שמורות, וגם קרדיטים שנקנו בחבילות. אפשר לחזור למסלול בתשלום בכל רגע.`,
      button: { label: "חידוש המסלול", url: appUrl("/studio/billing") },
    }),
  ended: (v: Billing) =>
    render({
      subject: "המסלול שלך הסתיים",
      heading: "המסלול הסתיים כמו שביקשת",
      body: `${hi(v.name)}${esc(v.plan)} הסתיים, והחשבון עבר למסלול החינמי. לא יהיו חיובים נוספים. כל הערכות שלך נשארות שמורות, ואפשר לחזור מתי שרוצים.`,
      button: { label: "למסלולים", url: appUrl("/studio/billing") },
    }),
  cancelled: (v: Billing) =>
    render({
      subject: "הביטול נקלט",
      heading: "הביטול נקלט",
      body: `${hi(v.name)}${esc(v.plan)} לא יתחדש. הוא ממשיך לעבוד כרגיל עד <strong>${esc(dateHe(v.date))}</strong>, ואחר כך החשבון יעבור למסלול החינמי. התחרטת? אפשר לבטל את הביטול מעמוד המסלול עד אז.`,
      button: billingPage,
    }),
};
