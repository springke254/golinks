import api, { setAccessToken } from './api';
import { API } from '../utils/constants';

export async function signup(data) {
  const response = await api.post(API.AUTH.SIGNUP, {
    email: data.email,
    password: data.password,
    displayName: data.displayName,
  });
  return response.data;
}

export async function login(data) {
  const response = await api.post(API.AUTH.LOGIN, {
    email: data.email,
    password: data.password,
  });
  const { accessToken } = response.data;
  setAccessToken(accessToken);
  return response.data;
}

export async function refresh() {
  const response = await api.post(API.AUTH.REFRESH);
  const { accessToken } = response.data;
  setAccessToken(accessToken);
  return response.data;
}

export async function logout() {
  try {
    await api.post(API.AUTH.LOGOUT);
  } finally {
    setAccessToken(null);
  }
}

export async function logoutAll() {
  try {
    await api.post(API.AUTH.LOGOUT_ALL);
  } finally {
    setAccessToken(null);
  }
}

export async function verifyEmail(token) {
  const response = await api.get(API.AUTH.VERIFY_EMAIL, {
    params: { token },
  });
  return response.data;
}

export async function forgotPassword(email) {
  const response = await api.post(API.AUTH.FORGOT_PASSWORD, { email });
  return response.data;
}

export async function resetPassword(data) {
  const response = await api.post(API.AUTH.RESET_PASSWORD, {
    token: data.token,
    newPassword: data.password,
  });
  return response.data;
}
