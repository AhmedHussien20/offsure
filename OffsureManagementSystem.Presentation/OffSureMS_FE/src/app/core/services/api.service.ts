import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private buildHttpParams(params?: Record<string, any>): HttpParams | undefined {
    if (!params) return undefined;

    let httpParams = new HttpParams();
    for (const [key, raw] of Object.entries(params)) {
      if (raw === undefined || raw === null) continue;
      if (typeof raw === 'string' && raw.trim() === '') continue;

      // Support array params (repeat key)
      if (Array.isArray(raw)) {
        const cleaned = raw.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
        if (cleaned.length === 0) continue;
        for (const v of cleaned) {
          httpParams = httpParams.append(key, String(v));
        }
        continue;
      }

      httpParams = httpParams.set(key, String(raw));
    }

    return httpParams.keys().length ? httpParams : undefined;
  }

  get<T>(service: string, endpoint: string, params?: Record<string, any>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${service}/${endpoint}`, {
      params: this.buildHttpParams(params),
    });
  }


  post<T>(service: string, endpoint: string, body: any) {
    return this.http.post<T>(`${this.baseUrl}/${service}/${endpoint}`, body);
  }

  /** POST to `{apiUrl}/{service}` with no trailing path segment (e.g. create batch: `POST v1/batches`). */
  postRoot<T>(service: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${service}`, body);
  }

  /** POST with query string (e.g. OTP send: actorUserId) */
  postWithQuery<T>(
    service: string,
    endpoint: string,
    body: unknown,
    query: Record<string, string | number | boolean>
  ): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${service}/${endpoint}`, body ?? {}, {
      params: this.buildHttpParams(query),
    });
  }

  put<T>(service: string, endpoint: string, body: any) {
    return this.http.put<T>(`${this.baseUrl}/${service}/${endpoint}`, body);
  }

  delete<T>(service: string, endpoint: string) {
    return this.http.delete<T>(`${this.baseUrl}/${service}/${endpoint}`);
  }

patch<T>(service: string, endpoint: string, body: any) {
  return this.http.patch<T>(`${this.baseUrl}/${service}/${endpoint}`, body);
}

  getBlob(service: string, endpoint: string, params?: Record<string, any>): Observable<Blob> {
    return this.http.get<Blob>(`${this.baseUrl}/${service}/${endpoint}`, {
      params: this.buildHttpParams(params),
      responseType: 'blob' as 'json',
    });
  }

postFormData<T>(service: string, endpoint: string, formData: FormData): Observable<T> {
  return this.http.post<T>(`${this.baseUrl}/${service}/${endpoint}`, formData);
}


}
