// Supabase (PostgREST) caps every select at `max_rows` (1000 by default) and
// silently drops the rest. Any query that can grow past that — class-wide
// submissions/attempts, or one heavy user's history — must page through it.

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null; count?: number | null }>;

/**
 * Fetches every row of a query.
 *
 * `query(from, to, withCount)` must return the query with `.range(from, to)`
 * applied and a deterministic order (ties broken by a unique column such as
 * `id`); when `withCount` is true it must also ask for an exact count
 * (`.select(cols, { count: 'exact' })`).
 *
 * The first request returns the first page AND the total, so small results
 * cost a single round trip; the remaining pages are then fetched in parallel
 * (a few at a time) instead of one after another. The real page size is taken
 * from what the server actually returned, so it stays correct even if the
 * server's row cap is smaller than `pageSize`.
 */
export async function fetchAllRows<T>(
  query: (from: number, to: number, withCount: boolean) => Page<T>,
  pageSize = 1000,
  concurrency = 6,
): Promise<{ data: T[]; error: string | null }> {
  const first = await query(0, pageSize - 1, true);
  if (first.error) return { data: [], error: first.error.message };
  const all: T[] = [...(first.data ?? [])];
  const total = first.count;

  // No count available — fall back to sequential paging until an empty page.
  if (total == null) {
    for (let from = all.length; all.length > 0; ) {
      const { data, error } = await query(from, from + pageSize - 1, false);
      if (error) return { data: all, error: error.message };
      if (!data || data.length === 0) break;
      all.push(...data);
      from += data.length;
    }
    return { data: all, error: null };
  }

  if (all.length >= total || all.length === 0) return { data: all, error: null };

  const step = all.length; // the server's effective page size
  const starts: number[] = [];
  for (let from = step; from < total; from += step) starts.push(from);

  const pages: T[][] = new Array(starts.length);
  for (let i = 0; i < starts.length; i += concurrency) {
    const batch = starts.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((from) => query(from, from + step - 1, false)));
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.error) return { data: all.concat(...pages.filter(Boolean)), error: r.error.message };
      pages[i + j] = r.data ?? [];
    }
  }
  for (const p of pages) all.push(...p);
  return { data: all, error: null };
}
