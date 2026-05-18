export interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

