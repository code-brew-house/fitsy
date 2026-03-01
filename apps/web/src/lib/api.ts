const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Request failed' }));
      const err = new Error(body.message || `HTTP ${res.status}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
