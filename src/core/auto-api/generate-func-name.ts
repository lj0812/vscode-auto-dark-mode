import {
  suffixMap,
  validApiPathPrefix,
} from './config';

import { convertToCamelCase } from '@/utils';

export function generateFuncName(api: any) {
  // 替换 validApiPathPrefix 为 ''
  const path = validApiPathPrefix.reduce((prev, cur) => {
    return prev.replace(cur, '');
  }, api.path);

  // 按照 / 分割
  const pathArr = path.split('/').filter(Boolean).map(convertToCamelCase);

  const last = pathArr[pathArr.length - 1];

  const action = suffixMap[last] || api.method;
  const other = suffixMap[last] ? pathArr.slice(0, pathArr.length - 1) : pathArr;

  const funcName = [
    action,
    ...other
  ].join('_');

  return convertToCamelCase(funcName);
}
