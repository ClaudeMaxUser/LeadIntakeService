export function normalizeApiUrl(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = cleaned.includes('localhost') ? `http://${cleaned}` : `https://${cleaned}`;
  }
  return cleaned;
}

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('lead_intake_api_url');
    if (customUrl && customUrl.trim() !== '') return normalizeApiUrl(customUrl);

    const runtimeUrl = (window as any)?.__RUNTIME_CONFIG__?.VITE_API_URL;
    if (runtimeUrl && runtimeUrl.trim() !== '') return normalizeApiUrl(runtimeUrl);
  }
  const buildUrl = import.meta.env.VITE_API_URL;
  if (buildUrl && buildUrl.trim() !== '') return normalizeApiUrl(buildUrl);

  return 'http://localhost:3000';
}

export function getApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('lead_intake_api_key');
    if (customKey && customKey.trim() !== '') return customKey.trim();

    const runtimeKey = (window as any)?.__RUNTIME_CONFIG__?.VITE_API_KEY;
    if (runtimeKey && runtimeKey.trim() !== '') return runtimeKey.trim();
  }
  const buildKey = import.meta.env.VITE_API_KEY;
  if (buildKey && buildKey.trim() !== '') return buildKey.trim();

  return '';
}

export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const apiKey = getApiKey();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (apiKey) {
    headers.set('Authorization', `Bearer ${apiKey}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      `Network error: Failed to connect to Backend API at ${baseUrl}. Ensure the backend is running and CORS_ORIGIN is configured.`,
      0,
      { originalError: err.message }
    );
  }

  const rawText = await response.text();

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = JSON.parse(rawText);
    } catch {
      errorData = {
        error: rawText.startsWith('<')
          ? `Server returned an HTML error page (${response.status} ${response.statusText}). Check that VITE_API_URL points to the backend server.`
          : (rawText || `HTTP ${response.status} ${response.statusText}`),
      };
    }
    throw new ApiError(
      errorData.message || errorData.error || `HTTP ${response.status}`,
      response.status,
      errorData
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new ApiError(
      `Received non-JSON response from API at '${url}'. Check that VITE_API_URL (${baseUrl}) is pointing to the backend API.`,
      response.status,
      { rawResponse: rawText.slice(0, 300) }
    );
  }
}
