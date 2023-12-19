import { get } from './axios';
import type { Api } from './types';

export const searchApi = (params = {}) => {
  return get(`https://api.weizhipin.com/api/project/search`, params);
};

export const getInterface = (params = {}) => {
  return get(`https://api.weizhipin.com/api/interface/get`, params);
};

export const getAllApiListByProjectId = (id: string | number) => {
  return get('https://api.weizhipin.com/api/interface/list', {
    project_id: id,
    page: 1,
    limit: 10000
  });
};

export const getApiListByCategoryId = (id: string | number) => {
  return get('https://api.weizhipin.com/api/interface/list_cat', {
    catid: id,
    page: 1,
    limit: 10000
  });
};

export const getApiById = (id: string | number) => {
  return getInterface({
    id
  });
};

export default {
  searchApi,
  getInterface,
  getAllApiListByProjectId,
  getApiListByCategoryId
} as Api;