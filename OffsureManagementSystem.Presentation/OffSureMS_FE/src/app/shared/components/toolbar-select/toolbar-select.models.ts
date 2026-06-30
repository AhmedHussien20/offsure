import { Observable } from 'rxjs';

export interface ToolbarSelectOption<T = number | string | null> {
  label: string;
  value: T;
}

export type ToolbarSelectLoader = (
  search: string,
  pageIndex: number
) => Observable<{ items: ToolbarSelectOption<number>[]; totalCount: number }>;
