import api from './api';
import { API } from '../utils/constants';

export const getAnalyticsSummary = async (params = {}) => {
  const { data } = await api.get(API.ANALYTICS.SUMMARY, { params });
  return data;
};

export const getAnalyticsTimeSeries = async (params = {}) => {
  const { data } = await api.get(API.ANALYTICS.TIMESERIES, { params });
  return data;
};

export const getAnalyticsReferrers = async (params = {}) => {
  const { data } = await api.get(API.ANALYTICS.REFERRERS, { params });
  return data;
};

export const getAnalyticsTopLinks = async (params = {}) => {
  const { data } = await api.get(API.ANALYTICS.TOP_LINKS, { params });
  return data;
};
