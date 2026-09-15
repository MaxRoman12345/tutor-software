import { humanize } from "@/components/students/materials/types";

// Human labels for a student's combined users.exam_board enum:
//   A_LEVEL_EDEXCEL        → "A Level Edexcel"
//   GCSE_EDEXCEL_F         → "Edexcel Foundation GCSE"
//   GCSE_AQA_H_AQA_FM      → "AQA Higher GCSE + AQA Further Maths GCSE"
//   GCSE_EDEXCEL_H_AQA_FM  → "Edexcel Higher GCSE + AQA Further Maths GCSE"

const BOARD_LABEL: Record<string, string> = {
  EDEXCEL: "Edexcel",
  AQA: "AQA",
  OCR_A: "OCR A",
  OCR_B: "OCR B",
};

const TIER_LABEL: Record<string, string> = {
  H: "Higher",
  F: "Foundation",
  FM: "Further Maths",
};

const board = (b: string) => BOARD_LABEL[b] ?? humanize(b);

export function examBoardLabel(value: string | null | undefined): string {
  if (!value) return "";

  if (value.startsWith("A_LEVEL_")) {
    return `A Level ${board(value.slice("A_LEVEL_".length))}`;
  }

  if (value.startsWith("GCSE_")) {
    let rest = value.slice("GCSE_".length);
    const fm: string[] = [];

    // A trailing "AQA_FM" is a second qualification: AQA Further Maths.
    if (rest.endsWith("AQA_FM")) {
      fm.push("AQA Further Maths GCSE");
      rest = rest.slice(0, rest.length - "AQA_FM".length).replace(/_+$/, "");
    }

    const main: string[] = [];
    if (rest) {
      const cut = rest.lastIndexOf("_");
      const b = cut >= 0 ? rest.slice(0, cut) : rest;
      const tier = cut >= 0 ? rest.slice(cut + 1) : "";
      main.push(`${board(b)} ${TIER_LABEL[tier] ?? humanize(tier)} GCSE`);
    }

    return [...main, ...fm].join(" + ");
  }

  return humanize(value);
}

/**
 * Every exam_board enum value (mirrors the check constraint on
 * public.users.exam_board), paired with its friendly label. Lives here rather
 * than in the admin "use server" actions file, which may only export async
 * functions.
 */
export const EXAM_BOARDS: { value: string; label: string }[] = [
  "A_LEVEL_EDEXCEL",
  "A_LEVEL_AQA",
  "A_LEVEL_OCR_A",
  "A_LEVEL_OCR_B",
  "GCSE_EDEXCEL_F",
  "GCSE_EDEXCEL_H",
  "GCSE_AQA_F",
  "GCSE_AQA_H",
  "GCSE_AQA_FM",
  "GCSE_AQA_H_AQA_FM",
  "GCSE_EDEXCEL_H_AQA_FM",
].map((value) => ({ value, label: examBoardLabel(value) }));
