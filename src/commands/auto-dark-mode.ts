import postcss, { Declaration } from 'postcss';
import { MixinAtRule } from 'postcss-less';
import * as syntax from 'postcss-less';
import pluginAutoDarkMode from '../plugins/postcss-auto-dark-mode/index';
import * as compiler from 'vue-template-compiler';
import { includeColor } from '../utils/index';

import { getCurrentFileContent, getThemeFileContent, insertSnippet } from '../helpers/file.vscode';

import { ColorItem, ColorMap, VueComplierStyle } from '../types/index';
import ColorConverter from '../helpers/color-converter';
import * as vscode from 'vscode';

const INJECT_START_FLAG = `/* auto injected by auto-dark-mode start */`;
const INJECT_END_FLAG = `/* auto injected by auto-dark-mode end */`;
const INJECT_START_FLAG_REGEXP = INJECT_START_FLAG.replaceAll('*', '\\*');
const INJECT_END_FLAG_REGEXP = INJECT_END_FLAG.replaceAll('*', '\\*');

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

      const raw = content.slice(start + 1, end)
        // 替换指定标记中间的内容为空
        .replace(new RegExp(`${INJECT_START_FLAG_REGEXP}.*${INJECT_END_FLAG_REGEXP}\n`, 'gms'), '');

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
  const dark2LightWhiteListRegexp = new RegExp(light2DarkWhiteList.join('|'));

  const colorVarMap = new Map(colorList.map(item => [item.key, item.value]));

  // colorList -> colorMap
  const colorMap = colorList.reduce((acc: ColorMap, curr: ColorItem) => {
    acc[curr.value] = curr.key;
    return acc;
  }, {});

  const cc = new ColorConverter({ colorMap });

  function converter(param: Declaration | MixinAtRule): object | null {
    let key = '';
    let value = '';

    if (param.type === 'decl') {
      key = param.prop;
      value = param.value;
    } else if (param.type === 'atrule') {
      key = param.name;
      value = param.params;
    }

    // 转白色：背景色为白色时转换
    if (key.startsWith('background') && /^#(?:F{6}|F{3})$/.test(value.toUpperCase())) {
      return { value: '@dark_222' };
    }

    // 颜色转变量
    const newValue = cc.convert(value);
    if (param.type === 'atrule') {
      console.log(value, newValue);
    }

    // 转换 @l- 开头的颜色变量
    if (/(@l-[^-]+-\d{3,4}|@l-white)/.test(newValue)) {
      return { value: newValue.replace('@l', '@d') };
    }

    // 处理白名单色值
    if (dark2LightWhiteListRegexp.test(newValue)) {
      return { value: newValue.replace('@light', '@dark')};
    }

    return null;
  };

  const filterDecl = (param: Declaration | MixinAtRule) => {
    if (param.type === 'decl') {
      return param.prop.startsWith('color') || param.prop.startsWith('background');
    } else if (param.type === 'atrule') {
      return param.mixin;
    }

    return false;
  };

  // 3. 转换
  const injectStyles = await Promise.all(
    styles
      .map(async style => {
        const { raw, src } = style;

        const pureStyleContent = (src ? '' : raw)
          .replace(/^\n/gm, '')
          .replace(/\n$/gm, '');

        const processor = postcss([pluginAutoDarkMode({ converter, filterDecl })]);
        const result = await processor.process(pureStyleContent, { from: undefined, syntax });

        if (!result.css) {
          return {
            ...style,
            value: raw,
            newLineCount: style.lineCount
          };
        }

        const injectContent = [INJECT_START_FLAG, result.css, INJECT_END_FLAG].join('\n') + '\n';

        // 分隔正常样式和暗黑样式
        const rawArr = raw.split(/^(?=@media +.*\(prefers-color-scheme: +dark\))/m);
        const [normalStyle, ...customDarkStyles] = rawArr;
        // 在其中插入自动生成的内容
        const value = [normalStyle, injectContent].concat(customDarkStyles).join('');
        // 1 => 2 - 1 其中2为style标签占据的2行，1为插入内容最后添加的\n
        const newLineCount = value.split('\n').length + 1;

        return {
          ...style,
          value: value,
          newLineCount
        };
      })
  );

  console.log('injectStyles', injectStyles);
  // 4. 写入文件
  let offset = 0;
  // 重新计算每段要插入的位置
  const locationStyles = injectStyles.map((style, index, array) => {
    const { startLine, endLine, newLineCount, lineCount } = style;
    const injectStart = startLine + 1;
    let injectEnd = endLine;

    const nextStyle = array[index + 1];

    if (nextStyle) {
      offset += (newLineCount - lineCount);
      // 后续的块整体偏移，块本身不受影响
      nextStyle.startLine = nextStyle.startLine + offset;
      nextStyle.endLine = nextStyle.startLine + nextStyle.lineCount - 1;
    }

    const injectLocation: unknown = [injectStart, injectEnd];

    return { ...style, injectLocation };
  });

  console.log('locationStyles', locationStyles);

  locationStyles.forEach((item) => {
    insertSnippet(item as VueComplierStyle);
  });

}