export interface Page<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// Commit a complete collection only. A failed or shifting page must never be
// presented as the full ledger or silently hide actionable reservations.
export async function loadAllPages<T extends { id: string }>(
  fetchPage: (page: number) => Promise<Page<T>>,
): Promise<T[]> {
  const items: T[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | undefined;
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    if (!Array.isArray(result.items) || result.pageNumber !== page ||
        !Number.isInteger(result.totalCount) || result.totalCount < 0 ||
        !Number.isInteger(result.totalPages) || result.totalPages < 0 ||
        result.totalPages !== Math.ceil(result.totalCount / result.pageSize)) {
      throw new Error('The server returned an invalid booking page. Please refresh.');
    }
    expectedTotal ??= result.totalCount;
    if (expectedTotal !== result.totalCount) throw new Error('Bookings changed while loading. Please refresh.');
    for (const item of result.items) {
      if (!item.id || ids.has(item.id)) throw new Error('Bookings changed while loading. Please refresh.');
      ids.add(item.id);
      items.push(item);
    }
    if (page >= result.totalPages) {
      if (items.length !== expectedTotal) throw new Error('Some booking records could not be loaded. Please refresh.');
      return items;
    }
    if (result.items.length === 0) throw new Error('A booking page is missing. Please refresh.');
  }
}
