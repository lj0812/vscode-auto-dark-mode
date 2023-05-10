import { get } from './axios';

export const searchApi = (params = {}) => {
  console.log('searchApi', params);
  return get(`https://api.weizhipin.com/api/project/search`, params);
};

export default {
  searchApi
} as Api;