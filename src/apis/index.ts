import { get } from './axios';
import type { Api } from './types';

export const searchApi = (params = {}) => {
  console.log('searchApi', params);
  return get(`https://api.weizhipin.com/api/project/search`, params);
};

export default {
  searchApi
} as Api;