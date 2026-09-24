/** @param {{ batchId?: string | null }} user */
export function isUnassignedBatch(user) {
  return !user?.batchId;
}

/**
 * @template T
 * @param {T[]} users
 * @param {"all" | "unassigned" | string} batchFilter
 * @returns {T[]}
 */
export function filterUsersByBatch(users, batchFilter) {
  if (!batchFilter || batchFilter === "all") {
    return users;
  }
  if (batchFilter === "unassigned") {
    return users.filter((user) => isUnassignedBatch(user));
  }
  return users.filter((user) => user.batchId === batchFilter);
}
