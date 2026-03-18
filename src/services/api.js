import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pmf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pmf_token');
      localStorage.removeItem('pmf_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const sendOTP = (phone) => api.post('/api/auth/send-otp', { phone });
export const verifyOTP = (phone, otp) => api.post('/api/auth/verify-otp', { phone, otp });

export const registerUser = (data, tempToken) =>
  axios.post(`${BASE_URL}/api/users`, data, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tempToken}` }
  });

export const getMyProfile = () => api.get('/api/users/me');
export const updateProfile = (data) => api.put('/api/users/me', data);

export const addRelationship = (phone, relationType) =>
  api.post('/api/relationships', { to_user_phone: phone, relation_type: relationType });
export const getMyRelationships = () => api.get('/api/relationships/mine');
export const verifyRelationship = (id) => api.post('/api/relationships/verify', { relationship_id: id });
export const rejectRelationship = (id) => api.post('/api/relationships/reject', { relationship_id: id });

export default api;
