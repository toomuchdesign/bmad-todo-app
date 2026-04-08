/** Error thrown when an HTTP response has a non-ok status. */
class HttpError extends Error {
  status: number;

  constructor({ message, status }: { message: string; status: number }) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/**
 * Thin HTTP client over fetch. Returns parsed JSON on success,
 * throws HttpError on non-ok responses.
 */
async function request<T>(
  url: string,
  method: string,
  options?: RequestOptions,
): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers };
  const init: RequestInit = { method, headers };

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  if (options?.signal) {
    init.signal = options.signal;
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    let message = "";
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore parse failure
    }
    throw new HttpError({ message, status: response.status });
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function get<T>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, "GET", options);
}

function post<T>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, "POST", options);
}

function patch<T>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, "PATCH", options);
}

function del<T>(url: string, options?: RequestOptions): Promise<T> {
  return request<T>(url, "DELETE", options);
}

const httpClient = { get, post, patch, del };

export { HttpError, httpClient };
