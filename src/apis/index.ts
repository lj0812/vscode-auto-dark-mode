import { get } from './axios';
import type { Api } from './types';

export const searchApi = (params = {}) => {
  return get(`https://api.weizhipin.com/api/project/search`, params);
};

export const getInterface = (params = {}) => {
  return get(`https://api.weizhipin.com/api/interface/get`, params);
};

export default {
  searchApi,
  getInterface
} as Api;