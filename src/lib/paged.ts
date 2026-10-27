// Shared list envelope mirrored from the backend (PagedResponse).
//
// Every directory screen receives the same paging metadata, so the
// frontend paginates consistently and never has to infer total pages.
export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/**
 * Generated OpenAPI schemas mark every field optional, while the backend
 * always sends the full envelope. Normalize in the API layer so screens
 * never branch on transport-shaped `undefined`.
 */
export interface PagedResponseLike<T> {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
}

export function normalizePaged<T>(
  value: PagedResponseLike<T>,
): PagedResponse<T> {
  const content = value.content ?? [];
  const page = value.page ?? 0;
  const size = value.size ?? content.length;
  const totalElements = value.totalElements ?? content.length;
  const totalPages =
    value.totalPages ?? (size > 0 ? Math.ceil(totalElements / size) : 0);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: value.first ?? page <= 0,
    last: value.last ?? page >= Math.max(0, totalPages - 1),
  };
}

export const MAX_PAGE_SIZE = 100;

/** Page size used by the administration tables. */
export const ADMIN_PAGE_SIZE = 20;
