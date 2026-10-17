import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api/v1' : 'http://localhost:5000/api/v1');

// In-memory token storage reference
let memoryToken = null;

export const setAuthToken = (token) => {
  memoryToken = token;
  if (token) {
    sessionStorage.setItem('scv_token', token);
  } else {
    sessionStorage.removeItem('scv_token');
  }
};

export const getAuthToken = () => {
  return memoryToken || sessionStorage.getItem('scv_token');
};

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

// Request interceptor to attach Bearer token
axiosClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    
    return Promise.reject({
      status: error.response?.status,
      message,
      original: error,
    });
  }
);

export default axiosClient;
