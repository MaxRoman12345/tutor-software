// A topic's `section_course` is a raw enum: A-Level topics carry
// PURE_MATHEMATICS / STATISTICS / MECHANICS; GCSE topics carry their tier
// (NORMAL = Higher, FOUNDATION, FURTHER = Further Maths). This maps the enum to
// a display heading and a sort order, and is the single place that turns the
// tier into a clear "Higher" / "Further Maths" heading so normal and Further
// Maths topics group separately. Shared by every topic-grouping view.

const SECTION_META: Record<string, { label: string; order: number }> = {
  PURE_MATHEMATICS: { label: "Pure Mathematics", order: 0 },
  STATISTICS: { label: "Statistics", order: 1 },
  MECHANICS: { label: "Mechanics", order: 2 },
  FOUNDATION: { label: "Foundation", order: 3 },
  NORMAL: { label: "Higher", order: 4 },
  FURTHER: { label: "Further Maths", order: 5 },
};

/** Display heading for a section_course enum (falls back to "Other"). */
export function sectionLabel(sectionCourse: string): string {
  return SECTION_META[sectionCourse]?.label ?? "Other";
}

/** Sort order for a display heading; unknown headings sort last. */
export function sectionOrder(label: string): number {
  const meta = Object.values(SECTION_META).find((m) => m.label === label);
  return meta ? meta.order : 99;
}
