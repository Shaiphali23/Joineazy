import axios from 'axios';

const TOKEN_KEY = 'joineazy.token';

export const api = axios.create({ baseURL: '/api' });

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 means the token is gone or expired: drop it and bounce to login.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/** Pulls the server's human-readable message out of an axios error. */
export const errorMessage = (e) =>
  e?.response?.data?.error || e?.message || 'Something went wrong';
