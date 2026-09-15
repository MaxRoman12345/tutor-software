export type Progress = {
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
};

export const EMPTY: Progress = {
  total: 0,
  correct: 0,
  partial: 0,
  incorrect: 0,
};

export const markedCount = (p: Progress) => p.correct + p.partial + p.incorrect;
export const pctComplete = (p: Progress) =>
  p.total > 0 ? Math.round((markedCount(p) / p.total) * 100) : 0;
export const isComplete = (p: Progress) =>
  p.total > 0 && markedCount(p) === p.total;

// Public storage bucket holding every question paper / mark scheme. qp_path and
// ms_path on past_paper are stored relative to this bucket root, mirroring the
// on-disk folder tree (exam board / spec / module / QUESTION_PAPERS|MARKSCHEMES).
export const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/question-assets`;

export function pdfUrl(path: string | null): string | null {
  if (!path) return null;
  // Guard against an already-absolute URL being stored; otherwise treat the
  // value as a bucket-relative path and encode each segment (paths contain
  // spaces and brackets, e.g. "June 2013 (R) QP.pdf").
  if (/^https?:\/\//i.test(path)) return path;
  return `${STORAGE_BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

// Public bucket for tutor-uploaded custom homework PDFs. homework_files.path is
// stored relative to this bucket root.
export const HOMEWORK_PDF_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/homework-pdfs`;

export function homeworkPdfUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${HOMEWORK_PDF_BASE}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

// Acronyms that stay fully upper-cased when humanising an enum value. Note
// EDEXCEL is deliberately NOT here: "EDEXCEL_H" reads as "Edexcel H".
const ACRONYMS = new Set(["AQA", "OCR", "MEI", "GCSE", "QP", "MS"]);

/**
 * Turns a stored enum-ish value into a human label, the single rule the UI uses
 * for boards, qualifications, specs and modules alike:
 *   A_LEVEL   → "A Level"      EDEXCEL_H → "Edexcel H"
 *   OCR_A     → "OCR A"        PURE_1    → "Pure 1"        C3 → "C3"
 * Splits on underscores/spaces, keeps known acronyms and short module codes
 * as-is, upper-cases single letters, and title-cases the rest.
 */
export function humanize(value: string | null): string {
  if (!value) return "-";
  return value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((token) => {
      const upper = token.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      if (/^[A-Z]{1,2}\d+$/.test(token)) return token; // module codes: C3, M1, S2
      if (token.length === 1) return upper; // tier/spec letters: A, H, F
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

// Friendlier wording for spec_level, which now blends A-Level spec (new/old)
// with GCSE tier (higher/foundation/further). Falls back to humanize.
const SPEC_LABELS: Record<string, string> = {
  NEW_SPEC: "New spec",
  OLD_SPEC: "Old spec",
  NORMAL: "Higher",
  FOUNDATION: "Foundation",
  FURTHER: "Further",
};

export function specLabel(spec: string | null): string {
  if (!spec) return "-";
  return SPEC_LABELS[spec] ?? humanize(spec);
}

/**
 * paper_module is now text and means different things per qualification: an
 * A-Level module code (C3, PURE_1) or a GCSE paper number (1, 2, 3). Render the
 * numeric GCSE case as "Paper N", everything else via humanize.
 */
export function moduleLabel(
  module: string | null,
  gcseAlevel?: string | null,
): string {
  if (!module) return "-";
  if (gcseAlevel === "GCSE" && /^\d+$/.test(module)) return `Paper ${module}`;
  return humanize(module);
}

// Back-compat alias: existing call sites import formatModule for module labels.
export const formatModule = humanize;

export function uniq(values: (string | null)[]) {
  return [...new Set(values.filter((v): v is string => !!v))].sort();
}

/**
 * Orders question numbers naturally (1, 2, 10 - not 1, 10, 2). questions.
 * question_number is an int4 in the database, but some rows arrive as strings
 * (e.g. "1a"), so coerce to string and compare numerically rather than calling
 * localeCompare on a value that might be a number.
 */
export function compareQuestionNumber(a: unknown, b: unknown): number {
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
