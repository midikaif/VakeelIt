import axios from 'axios';

// Fallback to localhost if the environment variable isn't set
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

// Create the centralized Axios instance
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});


export default api;
