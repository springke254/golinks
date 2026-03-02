import api from './api';
import { API } from '../utils/constants';

export const getAuditLogs = async (params = {}) => {
  const { data } = await api.get(API.AUDIT.LIST, { params });
  return data;
};

export const getAuditActions = async () => {
  const { data } = await api.get(API.AUDIT.ACTIONS);
  return data;
};
