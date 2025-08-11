import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Enhanced error handling with better error messages
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || res.statusText;
    } catch {
      // If JSON parsing fails, use status text
    }
    
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

// Optimized API request function with better error handling and logging
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  headers?: Record<string, string>
): Promise<Response> {
  const startTime = performance.now();
  
  // Prepare headers
  const defaultHeaders: Record<string, string> = {};
  
  if (data) {
    defaultHeaders["Content-Type"] = "application/json";
  }
  
  // Add authorization header if token exists
  const token = localStorage.getItem("auth_token");
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }
  
  // Merge custom headers with default headers
  const finalHeaders = { ...defaultHeaders, ...headers };

  // Prepend backend URL if the URL doesn't start with http
  const fullUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
  
  // Enhanced logging for debugging
  console.log("🌐 API Request:", {
    method,
    originalUrl: url,
    fullUrl,
    headers: finalHeaders,
    data: data ? (typeof data === 'object' && data !== null ? 
      { ...data, accessToken: (data as any).accessToken ? '[REDACTED]' : undefined } : data) : undefined
  });

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: finalHeaders,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.log("📡 API Response:", {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      duration: `${duration}ms`
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.error("❌ API Request Failed:", {
      method,
      url: fullUrl,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  }
}

// Enhanced query function with better error handling
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const startTime = performance.now();
    
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("🔒 Unauthorized request, returning null");
        return null;
      }

      await throwIfResNotOk(res);
      
      const data = await res.json();
      console.log("✅ Query successful:", { queryKey, duration: `${duration}ms` });
      
      return data;
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.error("❌ Query failed:", { 
        queryKey, 
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  };

// Optimized QueryClient configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
      retryDelay: 0,
    },
  },
});
