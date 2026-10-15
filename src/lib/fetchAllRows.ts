// Supabase (PostgREST) caps every select at `max_rows` (1000 by default) and
// silently drops the rest. Any query that can grow past that — class-wide
// submissions/attempts, or one heavy user's history — must page through it.

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * Fetches every row by requesting consecutive ranges until an empty page.
 * `query(from, to)` must return the same query with `.range(from, to)` applied
 * and a deterministic order (ties broken by a unique column such as `id`).
 * Advances by the number of rows actually returned, so it is correct even if
 * the server's row cap is smaller than `pageSize`.
 */
export async function fetchAllRows<T>(
  query: (from: number, to: number) => Page<T>,
  pageSize = 1000,
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) return { data: all, error: error.message };
    if (!data || data.length === 0) break;
    all.push(...data);
    from += data.length;
  }
  return { data: all, error: null };
}
