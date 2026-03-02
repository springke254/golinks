import api from './api';
import { API } from '../utils/constants';

export async function getMe() {
  const response = await api.get(API.USERS.ME);
  return response.data;
}

export async function updateMe(data) {
  const response = await api.put(API.USERS.UPDATE_ME, data);
  return response.data;
}

export async function getSessions() {
  const response = await api.get(API.USERS.SESSIONS);
  return response.data;
}

export async function revokeSession(sessionId) {
  const response = await api.delete(API.USERS.REVOKE_SESSION(sessionId));
  return response.data;
}
