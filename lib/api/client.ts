// Generic API Response wrapper
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Mock API Client to simulate backend calls
class MockApiClient {
  private static instance: MockApiClient;
  private delay: number = 500; // ms

  private constructor() {}

  public static getInstance(): MockApiClient {
    if (!MockApiClient.instance) {
      MockApiClient.instance = new MockApiClient();
    }
    return MockApiClient.instance;
  }

  // Simulate GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    console.log(`[MockAPI] GET ${endpoint}`);
    await this.simulateDelay();

    // Here we can switch on endpoint to return specific mock data
    // For now, we'll return a generic success if no specific handler
    return { data: {} as T };
  }

  // Simulate POST request
  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    console.log(`[MockAPI] POST ${endpoint}`, body);
    await this.simulateDelay();
    return { data: body as T }; // Echo back for now
  }

  // Simulate PUT request
  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    console.log(`[MockAPI] PUT ${endpoint}`, body);
    await this.simulateDelay();
    return { data: body as T };
  }

  // Simulate DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    console.log(`[MockAPI] DELETE ${endpoint}`);
    await this.simulateDelay();
    return { data: {} as T };
  }

  private simulateDelay() {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }
}

export const apiClient = MockApiClient.getInstance();
