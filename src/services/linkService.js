import api from './api';
import { API } from '../utils/constants';

export const getLinks = async (params = {}) => {
  const { data } = await api.get(API.LINKS.LIST, { params });
  return data;
};

export const createLink = async (payload) => {
  const { data } = await api.post(API.LINKS.CREATE, payload);
  return data;
};

export const getLinkById = async (id) => {
  const { data } = await api.get(API.LINKS.GET(id));
  return data;
};

export const updateLink = async (id, payload) => {
  const { data } = await api.put(API.LINKS.UPDATE(id), payload);
  return data;
};

export const deleteLink = async (id) => {
  const { data } = await api.delete(API.LINKS.DELETE(id));
  return data;
};

export const bulkDeleteLinks = async (ids) => {
  const { data } = await api.post(API.LINKS.BULK_DELETE, { ids });
  return data;
};

export const getLinkStats = async () => {
  const { data } = await api.get(API.LINKS.STATS);
  return data;
};

export const checkSlugAvailability = async (slug) => {
  const { data } = await api.get(API.LINKS.CHECK_SLUG(slug));
  return data;
};

export const getUserTags = async () => {
  const { data } = await api.get(API.LINKS.TAGS);
  return data;
};

export const bulkImportLinks = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post(API.LINKS.BULK_IMPORT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getBulkOperationStatus = async (operationId) => {
  const { data } = await api.get(API.LINKS.BULK_OPERATION(operationId));
  return data;
};
