/**
 * @template T
 * @param {T[]} items
 * @param {number} page 1-based
 * @param {number} pageSize
 */
export function paginate(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  return {
    page: currentPage,
    totalPages,
    items: items.slice(startIndex, endIndex),
    from: total === 0 ? 0 : startIndex + 1,
    to: endIndex,
    total,
  };
}
