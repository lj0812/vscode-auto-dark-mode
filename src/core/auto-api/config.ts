export const suffixMap: Record<string, string> = {
  add: 'add',
  save: 'save',
  addOrUpdate: 'save',
  saveOrUpdate: 'save',
  delete: 'delete',
  del: 'delete',
  remove: 'delete',
  update: 'update',
  modify: 'update',
  edit: 'update',
  get: 'get',
  query: 'get',
  list: 'get',
  search: 'get',
  options: 'get',
  overview: 'get',
  details: 'get',
  detail: 'get',
  stat: 'get',
  download: 'download'
};

/** 判断是否是有效路径 */
export const validApiPathPrefix = [
  '/api/app/monitor/',
  '/wapi/zpapmadmin/'
];

export const isValidPath = (path: string) => {
  return validApiPathPrefix.some(_ => path.startsWith(_));
};

export const apiTypePrefix = 'API';
export const apiParamsType = 'Params';
export const apiResponseType = 'Response';

export const onlyHasQueryMethods = [
  'get',
  'head',
  'options',
];

export const typeMap: Record<string, string> = {
  'text': 'string',
  'file': 'File',
  'integer': 'number',
  'string': 'string',
  'number': 'number',
  'boolean': 'boolean',
};

// 可以借用 ai 的能力推断字段类型
export const key2Type: Record<string, string> = {
  pageNo: 'number',
  pageSize: 'number',
  page: 'number',
  size: 'number',
  limit: 'number',
  offset: 'number',
};

export const interType = (key: string, type: string) => {
  return typeMap[type] || key2Type[key] || 'string';
};