import api from './api';
import { API } from '../utils/constants';

export async function getLinkedAccounts() {
  const response = await api.get(API.OAUTH.ACCOUNTS);
  return response.data;
}

export async function linkProvider(provider, providerAccessToken) {
  const response = await api.post(API.OAUTH.LINK, {
    provider,
    providerAccessToken,
  });
  return response.data;
}

export async function unlinkProvider(provider) {
  const response = await api.delete(API.OAUTH.UNLINK(provider));
  return response.data;
}
