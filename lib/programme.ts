/**
 * A student's `users.exam_board` is a combined enum encoding qualification,
 * board and - for GCSE - tier and whether Further Maths is included:
 *
 *   A_LEVEL_EDEXCEL / A_LEVEL_AQA / A_LEVEL_OCR_A / A_LEVEL_OCR_B
 *   GCSE_AQA_H            AQA Higher (normal)          → spec NORMAL
 *   GCSE_AQA_F            AQA Foundation               → spec FOUNDATION
 *   GCSE_AQA_FM           AQA Further Maths            → spec FURTHER
 *   GCSE_EDEXCEL_H / _F   Edexcel Higher / Foundation  → NORMAL / FOUNDATION
 *   GCSE_EDEXCEL_H_AQA_FM Edexcel Higher + AQA Further → EDEXCEL NORMAL + AQA FURTHER
 *   GCSE_AQA_H_AQA_FM     AQA Higher + AQA Further     → AQA NORMAL + AQA FURTHER
 *
 * A past paper stores these separately as `gcse_alevel` ("GCSE" | "A_LEVEL"),
 * `exam_board` ("AQA", "EDEXCEL", "OCR A", "OCR B") and `spec_level`
 * ("OLD_SPEC"/"NEW_SPEC" for A-Level; "NORMAL"/"FOUNDATION"/"FURTHER" for GCSE).
 * programmeFilter decodes the enum into the set of (board, spec) a student's
 * programme actually covers, so counts and topic lists don't leak in other
 * tiers or boards.
 *
 * Shared by the dashboard, materials and tutor views so "in programme" can't
 * drift between them.
 */

/**
 * Pseudo "exam board" worksheets surface under. Worksheets are uni-board and
 * A-Level, so they sit alongside the real boards under the A-Level qualification
 * and count as in-programme for every A-Level student.
 */
export const WORKSHEET_BOARD = "Worksheets";

// Comparison key for a board: uppercase, strip spaces/underscores.
// "OCR A" and "OCR_A" both become "OCRA".
function boardKey(board: string): string {
  return board.toUpperCase().replace(/[\s_]+/g, "");
}

type Unit = {
  level: "GCSE" | "A_LEVEL";
  board: string; // already boardKey-normalised
  specs: Set<string> | "ALL";
};

// GCSE tier letter → paper spec_level.
const TIER_SPEC: Record<string, string> = {
  H: "NORMAL",
  F: "FOUNDATION",
  FM: "FURTHER",
};

/** Decode users.exam_board into the programme units it covers. */
function parseProgramme(examBoard: string): Unit[] {
  if (examBoard.startsWith("A_LEVEL_")) {
    // A-Level has no tiers - both old and new spec count.
    return [
      { level: "A_LEVEL", board: boardKey(examBoard.slice("A_LEVEL_".length)), specs: "ALL" },
    ];
  }

  if (examBoard.startsWith("GCSE_")) {
    let rest = examBoard.slice("GCSE_".length);
    const units: Unit[] = [];

    // A trailing "AQA_FM" is always a second unit: AQA Further Maths.
    if (rest.endsWith("AQA_FM")) {
      units.push({ level: "GCSE", board: boardKey("AQA"), specs: new Set(["FURTHER"]) });
      rest = rest.slice(0, rest.length - "AQA_FM".length).replace(/_+$/, "");
    }

    // What's left (if anything) is "<BOARD>_<TIER>", tier in {H, F}.
    if (rest) {
      const cut = rest.lastIndexOf("_");
      const board = cut >= 0 ? rest.slice(0, cut) : rest;
      const spec = TIER_SPEC[cut >= 0 ? rest.slice(cut + 1) : ""];
      if (spec) {
        units.push({ level: "GCSE", board: boardKey(board), specs: new Set([spec]) });
      }
    }

    return units;
  }

  return [];
}

/**
 * Returns a predicate `(gcseAlevel, board, specLevel?) => boolean`.
 *  - Pass all three to test a specific paper (counts, topic filtering).
 *  - Omit specLevel to test only whether a (qualification, board) is in the
 *    programme at any tier - used for board-level highlighting in Materials.
 *
 * No board set (or an unrecognised value) → matches everything, so a missing
 * setting surfaces the whole catalogue rather than silently hiding it.
 */
export function programmeFilter(
  examBoard: string | null,
): (gcseAlevel: string, board: string, specLevel?: string) => boolean {
  if (!examBoard) return () => true;

  const units = parseProgramme(examBoard);
  if (units.length === 0) return () => true;

  return (gcseAlevel, board, specLevel) =>
    units.some((u) => {
      if (u.level !== gcseAlevel) return false;
      if (u.board !== boardKey(board)) return false;
      if (specLevel === undefined) return true;
      return u.specs === "ALL" || u.specs.has(specLevel);
    });
}
