import { RgbaColor } from '../types/index';
import { getFileIndentation } from '../helpers/config.vscode';
export * from './is';

export const isHexColor = (color: string) => {
  return /#([a-f0-9]{6}|[a-f0-9]{3})/i.test(color);
};

export const isRgbColor = (color: string) => {
  return /rgba?\(([0-9]{1,3}), *([0-9]{1,3}), *([0-9]{1,3})(?:, *([0-9.]{1,}))?\)/i.test(color);
};

export const includeColor = (color: string) => {
  return isHexColor(color) || isRgbColor(color);
};

// 0.121 -> 12%
export const formatPercent = (num: number) => {
  return `${Math.round(num * 100)}%`;
};

/**
 * 根据rgba?转换成对应的对象
 * 比如：
 * rgb(223, 161, 121) -> { r: 223, g: 161, b: 121 } 或
 * rgba(223, 161, 121, 0.1) -> { r: 223, g: 161, b: 121, a: 0.1 }
 * @param {*} rgbaStr
 * @returns {Object}
 */
export const parseRgbaStr = (rgbaStr: string) => {
  let [, r, g, b, a] = rgbaStr.match(/^rgba?\(([0-9]{1,3}), *([0-9]{1,3}), *([0-9]{1,3})(?:, *([0-9.]{1,}))?\)$/i);

  const result: RgbaColor = {
    r: parseInt(r),
    g: parseInt(g),
    b: parseInt(b),
  };
  if (a) {result.a = parseFloat(a);};

  return result;
};

// rgb 转 hex，并最终保留6位
export const rgb2hex = (r: number, g: number, b: number) => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// hex 转 rgb
export const hex2rgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

export const darkenColor = (hex: string, percent: number) => {
  const { r, g, b } = hex2rgb(hex)!;
  const amount = Math.round(255 * percent / 100);

  return rgb2hex(Math.max(r - amount, 0), Math.max(g - amount, 0), Math.max(b - amount, 0));
};

// 3位hex转6位hex
export const normalizeHex = (hex: string) => hex.length >= 6 ? hex : hex.replace(/[0-9a-f]/ig, match => match.repeat(2));

// 字符串首字母大写
export const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const convertToCamelCase = (input: string) => {
  return input.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
};
