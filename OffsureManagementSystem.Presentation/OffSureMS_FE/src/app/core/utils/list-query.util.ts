import { SearchCriteria } from '../models/search-criteria.model';

/** Build query params for paginated list APIs (searchKey + filterTypes fields). */
export function buildPagedListQuery(
  criteria: SearchCriteria,
  options?: {
    extra?: Record<string, unknown>;
    /** Defaults to keys in criteria.filterTypes (excluding searchKey). */
    filterKeys?: string[];
  }
): Record<string, unknown> {
  const query: Record<string, unknown> = {
    pageIndex: criteria.pageIndex ?? 1,
    pageSize: criteria.pageSize ?? 10,
    sortColumn: criteria.sortColumn,
    sortDirection: criteria.sortDirection,
  };

  const searchKey = criteria.searchKey?.trim();
  if (searchKey) {
    query['searchKey'] = searchKey;
  }

  const filterKeys =
    options?.filterKeys ??
    Object.keys(criteria.filterTypes ?? {}).filter(k => k !== 'searchKey');

  for (const key of filterKeys) {
    const value = criteria[key];
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (typeof value === 'number' && value === 0) {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    query[key] = value;
  }

  if (options?.extra) {
    Object.assign(query, options.extra);
  }

  return query;
}
