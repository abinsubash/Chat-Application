import axios from 'axios';
import store from '../store/store';
import { setUser } from '../store/slice';
import type { UserData } from '../store/slice';

const api = axios.create({
  baseURL: 'https://chat-application-lf8s.onrender.com',
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const state = store.getState();
  const token = state.user.user?.accessToken;
  
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const newToken = response.headers['new-access-token'];
    if (newToken && store.getState().user.user) {
      const currentUser = store.getState().user.user as UserData;
      store.dispatch(setUser({
        accessToken: newToken,
        name: currentUser.name,
        email: currentUser.email,
        username: currentUser.username,
        _id:currentUser._id
      }));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const searchUsers = async (username: string) => {
  if (!username.trim()) return { success: true, searchUser: [] };
  
  try {
    const response = await api.post('/search', { username });
    return response.data;
  } catch (error) {
    console.error('Search error:', error);
    return { success: false, searchUser: [] };
  }
};

export default api;