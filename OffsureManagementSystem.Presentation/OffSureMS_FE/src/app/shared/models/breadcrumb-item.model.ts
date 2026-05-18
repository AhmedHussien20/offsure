/** Page header crumb: translation key string, or key + router commands for dynamic links */
export type BreadcrumbItem = string | { key: string; route: (string | number)[] };
