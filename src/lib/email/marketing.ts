// Marketing email: the automatic steps that bring a user back to where they stopped, and the
// campaigns written in admin. Only to users who opted in (accounts.marketing_consent). Israeli law
// (Communications Law 30A) asks for "פרסומת" at the start of the subject, the sender's details, and
// a working unsubscribe in every message; mail clients also get a one-click List-Unsubscribe.
import { SITE } from "../site";
import { COST, PLANS } from "../plans";
import type { Email } from "./send";
import { appUrl, esc, hi, render, type Mail } from "./templates";

export type Recipient = { user_id: string; email: string; name: string | null; token: string };

const unsubscribeUrl = (token: string) => appUrl(`/unsubscribe?t=${token}`);

/** A marketing message to one recipient, with everything the law and the mail clients expect. */
export function marketingEmail(r: Recipient, m: Omit<Mail, "footer">): Email {
  const url = unsubscribeUrl(r.token);
  const footer = `קיבלת את המייל כי ביקשת לקבל עדכונים מ־${SITE.name}. נשלח על ידי ${SITE.operator}, ${SITE.operatorType} · <a href="mailto:${SITE.contactEmail}" style="color:#8a87a6">${SITE.contactEmail}</a><br><a href="${esc(url)}" style="color:#8a87a6;text-decoration:underline">להסרה מרשימת התפוצה בלחיצה אחת</a>`;
  const mail = render({ ...m, subject: `פרסומת: ${m.subject}`, footer });
  return {
    to: r.email,
    ...mail,
    headers: {
      "List-Unsubscribe": `<${appUrl(`/api/unsubscribe?t=${r.token}`)}>, <mailto:${SITE.contactEmail}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

// ---------- the automatic steps (see marketing_due() in the database) ----------

export type Step = "start" | "choose" | "video" | "credits" | "winback";
type Due = Recipient & { step: Step; plan: string; free_video_used: boolean };

export function stepMail(d: Due): Omit<Mail, "footer"> {
  const studio = appUrl("/studio");
  switch (d.step) {
    case "start":
      return {
        subject: "ערכת ההשקה הראשונה שלך, בשלוש דקות",
        heading: `${hi(d.name)}הסוכן מחכה לשיחה ✦`,
        body: `ראינו שעוד לא פתחת ערכת השקה. זה הכי פשוט שיש: מספרים לסוכן מה משיקים, במילים שלך או בקישור לדף המכירה, והוא שואל רק את מה שחסר.<br><br>
<strong>טיפ שעושה את ההבדל:</strong> מצרפים תמונה טובה של המרצה (הרקע לא משנה, הוא מוסר אוטומטית). תוך כשתי דקות יש שלושה כיוונים עיצוביים לבחור מהם.`,
        button: { label: "לפתיחת ערכה ראשונה", url: studio },
      };
    case "choose":
      return {
        subject: "שלושה כיוונים מחכים לך",
        heading: "הכיוונים שלך מוכנים",
        body: `${hi(d.name)}הסוכן הכין לך שלושה כיוונים עיצוביים, והם מחכים לבחירה. בוחרים אחד, ותוך שניות כל הערכה נבנית ממנו: גרפיקת תצוגה ומודעות, בארבעה גדלים.<br><br>
אף כיוון לא מדויק? אפשר לבחור את הקרוב ביותר ולבקש מהסוכן לשנות, במילים פשוטות.`,
        button: { label: "לבחירת כיוון", url: studio },
      };
    case "video":
      return d.plan === "free" && !d.free_video_used
        ? {
            subject: "סרטון הפרומו שלך, עלינו",
            heading: "הסרטון הראשון במתנה 🎬",
            body: `${hi(d.name)}הערכה שלך מוכנה, ועכשיו הזמן להפוך אותה לסרטון. סרטון פרומו לדוגמה אחד כלול גם במסלול החינמי: הסוכן כותב תסריט, קריין ישראלי מקריא, הכתוביות מתוזמנות למילה והמוזיקה מולחנת במיוחד.<br><br>
יש לך שיעור מוקלט? מעלים אותו, והסוכן משלב בסרטון את הרגעים החזקים שלו.`,
            button: { label: "ליצירת הסרטון", url: studio },
          }
        : {
            subject: "הערכה מוכנה. ומה עם סרטון?",
            heading: "הגיע הזמן לסרטון",
            body: `${hi(d.name)}הגרפיקות כבר בחוץ, וסרטון קצר עם קריינות הוא מה שעוצר את הגלילה. בוחרים קריין, הסוכן כותב תסריט ואתם מאשרים כל מילה לפני ההפקה. סרטון עולה ${COST.video} קרדיטים, ותיקונים אחר כך נעשים בעורך הסרטון.`,
            button: { label: "ליצירת סרטון", url: studio },
          };
    case "credits":
      return {
        subject: "נגמרו הקרדיטים? יש פתרון",
        heading: "הערכה שלך יכולה להרבה יותר",
        body: `${hi(d.name)}הקרדיטים החודשיים של המסלול החינמי כמעט נגמרו. במסלול ${PLANS.basic.name} מקבלים ${PLANS.basic.credits} קרדיטים בכל חודש, את כל ארבעת הגדלים בלי חותמת, סרטוני פרומו ושיווק עם קריינות, והורדה של כל הערכה בלחיצה.<br><br>
אפשר גם להוסיף חבילת קרדיטים חד־פעמית, בלי מנוי.`,
        button: { label: "למסלולים", url: appUrl("/studio/billing") },
      };
    case "winback":
      return {
        subject: "מה חדש בסטודיו",
        heading: "חזרנו עם כמה חידושים",
        body: `${hi(d.name)}מאז הביקור האחרון שלך הוספנו לסטודיו:<br><br>
✦ <strong>עורך סרטונים:</strong> מתקנים מילה, מדגישים, משנים צבע או מורידים אנימציה, ורואים מיד<br>
✦ <strong>קטעים מהשיעורים שלך</strong> בתוך הסרטון, גם עם הקול של המרצה<br>
✦ <strong>קריינים חדשים</strong> בעברית<br><br>
ההשקה הבאה שלך מתחילה בשיחה.`,
        button: { label: "חזרה לסטודיו", url: studio },
      };
  }
}

// ---------- campaigns ----------

export type Campaign = { subject: string; heading: string; body: string; button_label: string | null; button_url: string | null };

/** A campaign as written in admin: plain paragraphs (blank line between), the name greets each reader. */
export function campaignMail(c: Campaign, r: Recipient): Omit<Mail, "footer"> {
  const paragraphs = c.body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => esc(p.trim()).replace(/\n/g, "<br>"))
    .join("<br><br>");
  return {
    subject: c.subject,
    heading: esc(c.heading),
    body: `${hi(r.name)}${paragraphs}`,
    button: c.button_label && c.button_url ? { label: esc(c.button_label), url: c.button_url } : undefined,
  };
}
