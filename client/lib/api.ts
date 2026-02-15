
export function apiUrl(path: string = '') {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  if (!base) return path.startsWith('/') ? path : `/${path}`;
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

export const analyzeUrl = () => apiUrl('/analyze');

export const casesUrl = () => apiUrl('/cases');
