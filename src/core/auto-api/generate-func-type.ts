import { capitalize } from '@/utils';
import { compile } from 'json-schema-to-typescript';
import JSON5 from 'json5';
import {
  apiTypePrefix,
  apiParamsType,
  apiResponseType,
  onlyHasQueryMethods,
  interType
} from './config';
import { json2Type } from './utils';

export interface TypeProperty {
  name: string;
  type: string;
  comment?: string;
  optional?: boolean;
  readonly?: boolean
}

interface TypeDeclaration {
  name: string;
  properties: TypeProperty[];
  comment?: string;
}

const generateTypeName = (...args: string[]) => {
  return args.join('.');
};
export function generateFuncTypeName(funcName: string) {
  return {
    root: generateTypeName(apiTypePrefix, capitalize(funcName)),
    params: generateTypeName(apiTypePrefix, capitalize(funcName), apiParamsType),
    response: generateTypeName(apiTypePrefix, capitalize(funcName), apiResponseType)
  };
}

export const generateTypeProperty = (params: TypeProperty) => {
  const { name, type, comment, optional, readonly } = params;

  const optionalStr = optional ? '?' : '';
  const readonlyStr = readonly ? 'readonly ' : '';

  return {
    comment: comment ? `/** ${comment} */` : '',
    type: `${readonlyStr}${name}${optionalStr}: ${type};`
  };
};

const generateTypeWrap = (type: string, list: TypeProperty[]) => {

};

const generateTypeFromForm = (form: any) => {
  return form.map((item: any) => {
    const optional = item.required === '0';
    const name = item.name;
    const type = interType(name, item.type);
    const comment = item.desc;

    return {
      name,
      type,
      comment,
      optional,
    };
  });
};

const generateTypeFromQueryList = (list: any[]) => {
  return list.map(item => {
    const optional = item.required === '0';
    const name = item.name;
    const type = interType(name, item.type);
    const comment = item.desc;

    return {
      name,
      type,
      comment,
      optional,
    };
  });
};

const generateTypeFromJSONSchema = async (schema: any) => {
  return compile(schema, 'Params');
};
const generateTypeFromJSON = (json: any) => {
  return json2Type(json);
};

const generateParamsType = (api: any) => {
  // 有 4 类
  const types: Record<string, any[]> = {
    query: [],
    body: []
  };

  const queryList = api.req_query || [];
  types.query = generateTypeFromQueryList(queryList);
  if (onlyHasQueryMethods.includes(api.method.toLowerCase())) {
    return types;
  }

  const type = api.req_body_type;

  if (type === 'form') {
    const form = api.req_body_form;
    types.body = generateTypeFromForm(form);

    return types;
  }

  // type === 'json'
  const isJSONSchema = api.req_body_is_json_schema;
  const json = JSON5.parse(api.req_body_other);
  if (isJSONSchema) {
    // types.body = generateTypeFromJSONSchema(json);

    return types;
  }

  // types.body = generateTypeFromJSON(json);

  return types;
};

const generateResponseType = (api: any) => {
  try {
    const isJSONSchema = api.res_body_type === 'json' && api.res_body_is_json_schema;

    const json = JSON5.parse(api.res_body);
    if (isJSONSchema) {
      return generateTypeFromJSONSchema(json);
    }

    return generateTypeFromJSON(json?.zpData || json);
  } catch (error) {
    console.log('api.res_body', api.res_body);
    console.log('error', error);
  }
};

export function generateFuncType(api: any) {
  return {
    // params: generateParamsType(api),
    response: generateResponseType(api) as Record<string, TypeProperty[]>
  };
}

export default {
  generateFuncTypeName,
  generateFuncType
};