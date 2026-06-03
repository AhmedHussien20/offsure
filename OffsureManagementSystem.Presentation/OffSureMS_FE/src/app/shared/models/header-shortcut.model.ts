export interface HeaderShortcut {
  title: string;
  icon: string;
  path: string;
  queryParams?: Record<string, string>;
  alwaysEnabled?: boolean;
}
