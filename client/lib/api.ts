export function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  if (!base) return path;
  if (!path) return base;
  if (path.startsWith('/')) return `${base}${path}`;
  return `${base}/${path}`;
}

export const analyzeUrl = () => apiUrl('/analyze');

export const casesUrl = () => apiUrl('/cases');
