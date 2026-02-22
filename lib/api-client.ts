import { apiClient as mockApiClient, ApiResponse } from '@/lib/api/client';

export const apiClient = {
  get: async <T>(endpoint: string): Promise<ApiResponse<T>> => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      return mockApiClient.get<T>(endpoint);
    }

    try {
      const response = await fetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        return { data: {} as T, error: data.message || response.statusText };
      }

      return { data: data as T };
    } catch (error: any) {
      return { data: {} as T, error: error.message };
    }
  },

  post: async <T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      return mockApiClient.post<T>(endpoint, body);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        return { data: {} as T, error: data.message || response.statusText };
      }

      return { data: data as T };
    } catch (error: any) {
      return { data: {} as T, error: error.message };
    }
  },

  put: async <T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      return mockApiClient.put<T>(endpoint, body);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        return { data: {} as T, error: data.message || response.statusText };
      }

      return { data: data as T };
    } catch (error: any) {
      return { data: {} as T, error: error.message };
    }
  },

  delete: async <T>(endpoint: string): Promise<ApiResponse<T>> => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      return mockApiClient.delete<T>(endpoint);
    }

    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        return { data: {} as T, error: data.message || response.statusText };
      }

      return { data: data as T };
    } catch (error: any) {
      return { data: {} as T, error: error.message };
    }
  },
};
