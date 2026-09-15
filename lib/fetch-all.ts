/**
 * PostgREST caps every response at a fixed number of rows (1000 on Supabase by
 * default) and does it *silently* — a table that outgrows the cap just starts
 * returning partial data with no error. Any read that genuinely needs a whole
 * table has to page through it.
 *
 * `page` must apply a stable `.order(...)`, otherwise rows can repeat or go
 * missing between pages.
 */
const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllRows<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(`${label}:`, error);
      break;
    }
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}
