import postcss, { Declaration } from 'postcss';
import * as syntax from 'postcss-less';
import pluginReplaceColor from '../plugins/postcss-replace-color/index';
import * as compiler from 'vue-template-compiler';
import { includeColor } from '../utils/index';

import { getCurrentFileContent, getThemeFileContent, insertSnippet } from '../helpers/file.vscode';

import { ColorItem, ColorMap, VueComplierStyle } from '../types/index';
import ColorConverter from '../helpers/color-converter';
import * as vscode from 'vscode';

/**
 * 从vue单文件模板中获取styles
 * @param template vue 单文件模板内容
 * @returns styles
 */
export const getStyleCodes = (template: string) => {
  const result = compiler.parseComponent(template, { pad: 'space', deindent: true });
  const { styles } = result;

  const enrichedStyles = styles
    .map((style) => {
      const { start, end, content } = style;

      const startLine = content.slice(0, start).split('\n').length - 1; // zero-based
      const endLine = startLine + content.slice(start + 1, end).split('\n').length;

      const raw = content.slice(start + 1, end);

      return {
        ...style,
        raw,
        startLine,
        endLine,
        lineCount: endLine - startLine + 1,
      };
    });

  console.log('parseComponent result::', result);

  return enrichedStyles;
};

export default async function autoDarkMode() {
  // 1. 获取内容
  const content = getCurrentFileContent();
  const styles = getStyleCodes(content);

  if (styles.length === 0) {
    return vscode.window.showInformationMessage('当前文件没有style标签');
  }

  // 2. 获取颜色对应关系
  console.log('styles--', styles);
  const colorList = getThemeFileContent()
    .split('\n')
    .filter(line => {
      const themeColor = line.startsWith('@light_') ||
        line.startsWith('@dark_') ||
        line.startsWith('@d-') ||
        line.startsWith('@l-');

      return includeColor(line) && themeColor;
    })
    .map(line => {
        const result = line.match(/^(@[^:]+): *([^;]+);/);

        if (!result) {return null;};

        const [, key, value] = result;
        return { key, value };
    })
    .filter(Boolean);

  const colorVarMap = new Map(colorList.map(item => [item.key, item.value]));

  // colorList -> colorMap
  const colorMap = colorList.reduce((acc: ColorMap, curr: ColorItem) => {
    acc[curr.value] = curr.key;
    return acc;
  }, {});

  console.log('colorMap', colorMap);

  const replaceColorMap: { [x: string]: string } = {
    '@light_f8f': '@l-grey-100',
    '@light_f5f': '@l-grey-200',
    '@light_ebe': '@l-grey-300',
    '@light_37c': '@l-boss-600',
    '@light_333': '@l-grey-1000',
    '@light_666': '@l-grey-800',
    '@light_aaa': '@l-grey-600',
    '@light_c7c': '@l-grey-500',
    '@light_12a': '@l-boss-700',
  };

  // 根据replaceColorMap生成正则，替换字符串中对应的色值
  const replaceReg = new RegExp(Object.keys(replaceColorMap).join('|'), 'g');
  const replaceColor = (str: string) => str.replace(replaceReg, (matched) => replaceColorMap[matched]);

  const cc = new ColorConverter({ colorMap });

  const converter = (decl: Declaration) => {
    let { value } = decl;

    // 根据色值或变量转成旧色值对应的变量 todo: fade()的情况
    const oldColor: string = cc.convert(value);

    // 根据对应关系找到新色值对应的变量
    const newColor: string = replaceColor(oldColor);

    return {
      value: newColor
    };
  };

  const filterDecl = (decl: Declaration) => {
    return colorVarMap.has(decl.value) || includeColor(decl.value);
  };

  // 3. 转换
  const injectStyles = await Promise.all(
    styles
      .map(async style => {
        const { raw, src } = style;

        const styleContent = (src ? '' : raw);

        const processor = postcss([pluginReplaceColor({ converter, filterDecl })]);
        const result = await processor.process(styleContent, { from: undefined, syntax });

        const value = result.css;

        return {
          ...style,
          value: value,
        };
      })
  );

  console.log('injectStyles', injectStyles);
  // 4. 写入文件
  // 重新计算每段要插入的位置
  const locationStyles = injectStyles.map((style, index, array) => {
    const { startLine, endLine } = style;
    const injectStart = startLine + 1;
    let injectEnd = endLine;

    const injectLocation: unknown = [injectStart, injectEnd];

    return { ...style, injectLocation };
  });

  console.log('locationStyles', locationStyles);

  locationStyles.forEach((item) => {
    insertSnippet(item as VueComplierStyle);
  });

}