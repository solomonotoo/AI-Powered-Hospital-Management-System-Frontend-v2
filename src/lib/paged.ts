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

export const MAX_PAGE_SIZE = 100;

/** Page size used by the administration tables. */
export const ADMIN_PAGE_SIZE = 20;
