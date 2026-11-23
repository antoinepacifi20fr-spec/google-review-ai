import { z } from "zod";
import Papa from "papaparse";

export type ReplyStatus =
  | "none"
  | "draft"
  | "to_validate"
  | "approved"
  | "rejected"
  | "published_manual"
  | "published_api";

export const STATUS_LABEL: Record<ReplyStatus, string> = {
  none: "Sans réponse",
  draft: "Brouillon",
  to_validate: "À valider",
  approved: "Approuvée",
  rejected: "Rejetée",
  published_manual: "Publiée manuellement",
  published_api: "Publiée via API",
};

export const SOURCE_LABEL: Record<string, string> = {
  manual: "Import manuel",
  csv: "Import CSV",
  gbp_api: "Google Business Profile",
};

/** Règle de file : note strictement inférieure au seuil, ou inclusion explicite des notes hautes. */
export function shouldQueue(
  rating: number,
  threshold: number,
  includeHigh: boolean,
  hasExistingReply: boolean,
): boolean {
  if (hasExistingReply) return false;
  return rating < threshold || includeHigh;
}

export const OPEN_STATUSES: ReplyStatus[] = ["none", "draft", "to_validate", "rejected"];
export const ANSWERED_STATUSES: ReplyStatus[] = ["published_manual", "published_api"];

export interface ReviewLike {
  rating: number;
  reply_status: ReplyStatus | string;
  in_queue: boolean;
}

export function computeStats(reviews: ReviewLike[]) {
  const total = reviews.length;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const average = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : null;
  const answered = reviews.filter((r) =>
    (ANSWERED_STATUSES as string[]).includes(r.reply_status),
  ).length;
  const pending = reviews.filter(
    (r) => r.in_queue && (OPEN_STATUSES as string[]).includes(r.reply_status),
  ).length;
  const approved = reviews.filter((r) => r.reply_status === "approved").length;
  return {
    total,
    average,
    distribution,
    answered,
    answeredPct: total ? Math.round((answered / total) * 100) : null,
    pending,
    approved,
  };
}

export const reviewInputSchema = z.object({
  author_name: z.string().trim().min(1, "Auteur requis").max(120, "120 caractères max."),
  rating: z.coerce.number().int().min(1, "Note entre 1 et 5").max(5, "Note entre 1 et 5"),
  review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ")
    .refine((d) => !Number.isNaN(Date.parse(d)), "Date invalide")
    .refine((d) => new Date(d) <= new Date(Date.now() + 86400000), "Date dans le futur"),
  comment: z.string().trim().max(5000, "5000 caractères max.").default(""),
  external_id: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
  existing_reply: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v ? v : null)),
});
export type ReviewInput = z.output<typeof reviewInputSchema>;

export const CSV_MAX_ROWS = 1000;
export const CSV_FIELDS = [
  "author_name",
  "rating",
  "review_date",
  "comment",
  "external_id",
  "existing_reply",
] as const;
export type CsvField = (typeof CSV_FIELDS)[number];

export const CSV_FIELD_LABEL: Record<CsvField, string> = {
  author_name: "Auteur",
  rating: "Note (1–5)",
  review_date: "Date",
  comment: "Texte de l'avis",
  external_id: "Identifiant externe",
  existing_reply: "Réponse existante",
};

const GUESSES: Record<CsvField, string[]> = {
  author_name: ["auteur", "author", "nom", "name", "reviewer", "author_name"],
  rating: ["note", "rating", "etoiles", "étoiles", "stars", "score"],
  review_date: ["date", "review_date", "created", "publié", "publication"],
  comment: ["commentaire", "comment", "texte", "text", "avis", "review"],
  external_id: ["id", "external_id", "identifiant", "review_id"],
  existing_reply: ["reponse", "réponse", "reply", "response", "existing_reply"],
};

export function guessMapping(headers: string[]): Partial<Record<CsvField, string>> {
  const out: Partial<Record<CsvField, string>> = {};
  const norm = (s: string) => s.trim().toLowerCase();
  for (const field of CSV_FIELDS) {
    const exact = headers.find((h) => norm(h) === field);
    const hit = exact ?? headers.find((h) => GUESSES[field].some((g) => norm(h) === g));
    const loose = hit ?? headers.find((h) => GUESSES[field].some((g) => norm(h).includes(g)));
    if (loose && !Object.values(out).includes(loose)) out[field] = loose;
  }
  return out;
}

/** Accepte AAAA-MM-JJ, JJ/MM/AAAA et JJ-MM-AAAA. */
export function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return s;
}

export function parseCsv(text: string) {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return { headers: res.meta.fields ?? [], rows: res.data, parseErrors: res.errors };
}

export interface CsvRowResult {
  line: number;
  ok: boolean;
  value?: ReviewInput;
  errors?: string[];
}

export function validateRows(
  rows: Record<string, string>[],
  mapping: Partial<Record<CsvField, string>>,
): CsvRowResult[] {
  const seen = new Set<string>();
  return rows.slice(0, CSV_MAX_ROWS).map((row, i) => {
    const pick = (f: CsvField) => {
      const col = mapping[f];
      return col ? (row[col] ?? "").toString() : "";
    };
    const parsed = reviewInputSchema.safeParse({
      author_name: pick("author_name"),
      rating: pick("rating").replace(",", "."),
      review_date: normalizeDate(pick("review_date")),
      comment: pick("comment"),
      external_id: pick("external_id") || undefined,
      existing_reply: pick("existing_reply") || undefined,
    });
    const line = i + 2;
    if (!parsed.success) {
      return { line, ok: false, errors: parsed.error.issues.map((e) => e.message) };
    }
    const v = parsed.data;
    const key = v.external_id
      ? `id:${v.external_id}`
      : `${v.author_name.toLowerCase()}|${v.rating}|${v.review_date}|${v.comment.toLowerCase()}`;
    if (seen.has(key)) return { line, ok: false, errors: ["Doublon dans le fichier"] };
    seen.add(key);
    return { line, ok: true, value: v };
  });
}
