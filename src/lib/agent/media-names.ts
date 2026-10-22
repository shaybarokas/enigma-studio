// Role names for the UI (client-safe: no server imports).
export type { MediaRole } from "./media";
import type { MediaRole } from "./media";

export const ROLE_NAMES: Record<MediaRole, string> = { lecturer: "המרצה", logo: "לוגו", product: "מוצר", reference: "השראה", other: "אחר" };
export const ROLE_ORDER: MediaRole[] = ["lecturer", "logo", "product", "reference", "other"];
