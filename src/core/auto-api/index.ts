import * as api from '@/apis/index';

import { generateFuncName } from './generate-func-name';
import { generateFuncTypeName, generateFuncType, generateTypeProperty } from './generate-func-type';
import type { TypeProperty } from './generate-func-type';
import { join } from './utils';

export default {};

interface ApiItem {
  path: string;
  method: string;
  title: string;
  id: number;
}

const getApiListByCategoryId = async (categoryId: string) => {
  const res = await api.getApiListByCategoryId(categoryId);

  return (res.list || []);
};

const batchGetApi = async (ids: number[]) => {
  const res = await Promise.all(
    ids.map(id => api.getInterface({
      id
    }))
  );

  return res.map(item => item);
};


const enrichApi = (api: any) => {
  api.method = api.method.toLowerCase();

  const funcName = generateFuncName(api);
  const funcType = generateFuncTypeName(funcName);

  const type = generateFuncType(api);

  return {
    ...api,
    funcName,
    funcType,
    type
  };
};

const enrichApiList = async (apiList: any[]) => {
  const ids = apiList.map(item => item._id);
  const apiData = await batchGetApi(ids);

  return apiList
    .map((item, index) => {
      const data = apiData[index];

      return {
        ...item,
        ...data
      };
    })
    .map(enrichApi);
};

const generateApiStr = (api: any, indentStr = '') => {
  const funcName = api.funcName;
  const funcType = api.funcType;

//   return `/** ${api.title} */
// export const ${funcName} = (params: ${funcType.params}) => {
// ${indentStr}return ${api.method}<${funcType.response}>(\`${api.path}\`, params);
// };`;
  return `/** ${api.title} */
export const ${funcName} = (params?: unknown) => {
${indentStr}return ${api.method}<${funcType.response}>(\`${api.path}\`, params);
};`;
};

const generateTypeStr = (api: any, indentStr = '') => {
  const responseType = api.type.response as Record<string, TypeProperty[]>;

  const joinTemplate = join(indentStr);

  const types = Object.entries(responseType).map(([key, value]) => {
    const properties = value.map(item => {
      const property = generateTypeProperty(item);
      if (!property.comment) {
        return `${property.type}`;
      }

      return `${property.comment}\n${property.type}`;
    });

    return joinTemplate`interface ${key} {
${properties}
}`;
  });

  return joinTemplate`declare namespace ${api.funcType.root} {
${types}
}`;
};

export const generateApiListByCategoryId = async (categoryId: string, indentStr: string) => {
  const apiList = await getApiListByCategoryId(categoryId);

  const enrichedApiList = await enrichApiList(apiList);

  const apiStr = enrichedApiList
    .map(api => generateApiStr(api, indentStr))
    .join('\n\n');

  const responseTypes = enrichedApiList
    .map(api => {
      return generateTypeStr(api, indentStr);
    });

  return {
    apiList: enrichedApiList,
    apiStr,
    responseTypes
  };
};

export const generateApiById = async (id: string, indentStr: string) => {
  const apiRes = await api.getInterface({
    id
  });

  const enrichedApi = enrichApi(apiRes);

  const apiStr = generateApiStr(enrichedApi, indentStr);
  const responseType = generateTypeStr(enrichedApi, indentStr);

  return {
    ...enrichedApi,
    apiStr,
    responseType
  };
};