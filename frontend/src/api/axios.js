import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

const MAX_RETRIES = 2;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response handler with resilient automatic retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    
    // Explicitly reject and logout on 401s
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userEmail");
      window.location.replace("/");
      return Promise.reject(error);
    }

    // Track the number of retries implemented for this request
    config.retryCount = config.retryCount || 0;
    
    const isNetworkError = !error.response;
    const isTransientError = error.response?.status >= 500 && error.response?.status <= 599;
    
    // Silently retry failed requests 
    if ((isNetworkError || isTransientError) && config.retryCount < MAX_RETRIES) {
      config.retryCount += 1;
      
      // Delay before retrying using exponential backoff (1s, 2s)
      const backoffDelay = config.retryCount * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return api(config);
    }
    
    return Promise.reject(error);
  }
);

export default api;
