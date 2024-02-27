import { get, post } from '../http';

export const searchApi = (keyword: string) => {
  return get(`/api/project/search`, {
    params: {
      q: keyword
    }
  });
};

export const getInterfaceById = (id: number) => {
  return get(`/api/interface/get`, {
    params: {
      id
    }
  });
};