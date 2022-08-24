import postcss, { Declaration } from 'postcss';
import syntax from 'postcss-less';
import pluginAutoDarkMode from '../plugins/postcss-auto-dark-mode/index';
import * as compiler from 'vue-template-compiler';
import { includeColor } from '../utils/index';

import { getCurrentFileContent, getThemeFileContent, insertSnippet } from '../helpers/file.vscode';

import { ColorItem, ColorMap, CssStyleAttrs, VueComplierStyle } from '../types/index';
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
    .filter(style => !style.attrs['auto-injected'])
    .map((style) => {
      const { start, end, content } = style;

      const startLine = content.slice(0, start).split('\n').length - 1; // zero-based
      const endLine = startLine + content.slice(start + 1, end).split('\n').length;

      return {
        ...style,
        content: '\n' + content.slice(start + 1, end).replace(/^\n/gm, '').replace(/\n$/gm, ''),
        startLine,
        endLine,
        lineCount: endLine - startLine + 1,
      };
    });

  console.log('parseComponent result::', result);

  return enrichedStyles;
};

// 根据content 和 attrs 生成style标签
const createStyleTag = (content: string, attrs: CssStyleAttrs) => {
  const attrStr = Object.entries(attrs)
    .map(([key, value]) => {
      if (typeof value === 'boolean') {
        return key;
      }

      return `${key}="${value}"`;
    })
    .join(' ');
  return `<style ${attrStr}>\n${content}\n</style>`;
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

  console.log('colorList', colorList);

  const light2DarkWhiteList = [
    '@light_f8f',
    '@light_f5f',
    '@light_ebe',
    '@light_37c',
    '@light_12a',
    '@light_333',
    '@light_666',
    '@light_aaa',
    '@light_c7c',
  ];

  const colorVarMap = new Map(colorList.map(item => [item.key, item.value]));
  console.log('colorVarMap', colorVarMap);

  // colorList -> colorMap
  const colorMap = colorList.reduce((acc: ColorMap, curr: ColorItem) => {
    acc[curr.value] = curr.key;
    return acc;
  }, {});

  const cc = new ColorConverter({ colorMap });
  console.log(cc);

  const converter = (decl: Declaration) => {
    let { prop, value } = decl;
    // 转白色：背景色为白色时转换
    if (prop.startsWith('background') && /^#(?:F{6}|F{3})$/.test(value.toUpperCase())) {
      return { value: '@dark_222' };
    }

    // 颜色转变量
    const newValue = cc.convert(value);

    // 转换 @l- 开头的颜色变量
    if (newValue.startsWith('@l-')) {
      return { value: newValue.replace('@l', '@d') };
    }

    // 处理白名单色值
    if (light2DarkWhiteList.includes(newValue)) {
      return { value: newValue.replace('@light', '@dark')};
    }
  };

  const filterDecl = (decl: Declaration) => {
    return colorVarMap.has(decl.value) || includeColor(decl.value);
  };

  // 3. 转换
  const injectStyles = await Promise.all(
    styles
      .map(async style => {
        console.log('style', style);
        const { attrs, content, src } = style;

        const styleContent = src ? '' : content;

        const processor = postcss([pluginAutoDarkMode({ converter, filterDecl })]);
        const result = await processor.process(styleContent, { from: undefined, syntax });

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const newStyleTag = createStyleTag(result.css, { ...attrs, 'auto-injected': true });


        console.log('result', result);

        return {
          ...style,
          value: newStyleTag,
          valueLines: newStyleTag.split('\n').length
        };
      })
  );

  console.log('injectStyles', injectStyles);
  // 4. 写入文件

  // let point = injectStyles[0].endLine;
  // 重新计算每段要插入的位置
  const locationStyles = injectStyles.map((style, index, array) => {
    const { endLine, valueLines } = style;
    const injectStart = endLine + 1;
    let injectEnd = endLine + 1;

    const nextStyle = array[index + 1];

    if (nextStyle) {
      injectEnd = nextStyle.startLine;

      nextStyle.startLine = endLine + valueLines + 1;
      nextStyle.endLine = nextStyle.startLine + nextStyle.lineCount - 1;
    } else {
      injectEnd = endLine + 1e3;
    }

    const injectLocation: unknown = [injectStart, injectEnd];

    return { ...style, injectLocation };
  });

  locationStyles.forEach((item) => {
    insertSnippet(item as VueComplierStyle);
  });

}