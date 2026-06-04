import { environment } from '../../../environments/environment';

/** Resolves API-stored portfolio image paths to a browser-loadable URL. */
export function portfolioImageUrl(imageUrl: string | null | undefined): string {
  const raw = imageUrl?.trim();
  if (!raw) {
    return '';
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/portfolio-images/')) {
    return raw.startsWith('/') ? `${apiOrigin()}${raw}` : raw;
  }
  const fileName = raw.split(/[/\\]/).pop() ?? raw;
  return `${apiOrigin()}/portfolio-images/${encodeURIComponent(fileName)}`;
}

function apiOrigin(): string {
  return environment.apiUrl.replace(/\/api\/?$/i, '');
}
