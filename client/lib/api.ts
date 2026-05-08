import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
console.log('[API] Using baseURL:', baseURL);

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor to include token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error.response?.status === 401) {
            // Token expired or invalid, clear it and redirect to login
            localStorage.removeItem('token');
            // Only redirect if we're not already on the login page to avoid loops
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        if (typeof window !== 'undefined' && error.response?.status === 403 && error.response?.data?.inactive) {
            // Account is inactive, redirect to inactive wall
            if (!window.location.pathname.startsWith('/inactive-wall')) {
                window.location.href = '/inactive-wall';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
