const PAGE_SIZE = 1000

// PostgREST caps a single response at the project's db-max-rows setting
// (1000 by default) regardless of how many rows actually match - a
// query with no .range() silently truncates past that, rather than
// erroring, which is exactly how admin-bookings quietly started
// under-reporting once real order volume crossed 1000 rows. Pages
// through with .range() until a page comes back short of PAGE_SIZE.
//
// Takes a function rather than a query builder directly, so callers
// don't need to fight Supabase JS's generic builder types - just
// re-apply .range(from, to) to the same query each call.
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}
