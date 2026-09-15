// Date helpers. Dates move through the app as ISO yyyy-mm-dd strings (what
// Postgres `date` columns and <input type="date"> use); these convert to/from
// the UK dd/mm/yyyy the UI shows.

/** ISO yyyy-mm-dd → "dd/mm/yyyy". Returns "" for anything not ISO-shaped. */
export function isoToUk(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * "dd/mm/yyyy" (also d/m/yyyy) → ISO yyyy-mm-dd, or null if it isn't a real
 * calendar date. Rejects impossible days like 31/02/2026.
 */
export function ukToIso(uk: string): string | null {
  const m = uk.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const dt = new Date(`${iso}T12:00:00Z`);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCDate() !== Number(d) ||
    dt.getUTCMonth() + 1 !== Number(mo)
  ) {
    return null;
  }
  return iso;
}
