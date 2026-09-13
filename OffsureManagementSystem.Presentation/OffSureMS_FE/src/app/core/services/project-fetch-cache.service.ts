import { Injectable } from '@angular/core';

/** Short-lived in-memory cache so project detail → log-hours navigation reuses recent fetches. */
@Injectable({ providedIn: 'root' })
export class ProjectFetchCache {
  private readonly ttlMs = 120_000;
  private readonly entries = new Map<string, { at: number; value: unknown }>();

  get<T>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.at > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown): void {
    this.entries.set(key, { at: Date.now(), value });
  }

  invalidateProject(projectId: number): void {
    const suffix = `:${projectId}`;
    for (const key of [...this.entries.keys()]) {
      if (key.endsWith(suffix)) {
        this.entries.delete(key);
      }
    }
  }

  static projectKey(scope: 'admin' | 'my' | 'team' | 'rm', projectId: number): string {
    return `project:${scope}:${projectId}`;
  }

  static overviewKey(projectId: number): string {
    return `overview:${projectId}`;
  }
}
