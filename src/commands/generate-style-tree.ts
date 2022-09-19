import * as compiler from 'vue-template-compiler';
import * as vscode from 'vscode';
import { getCurrentFileContent, insertSnippetByPosition } from '../helpers/file.vscode';

// ===== 解析静态class =====
const parseStaticClass = (classStr: string) => {
  if (!classStr) {
    return [];
  }

  return classStr.split(/\s+/);
};

// ===== 解析动态class =====

// 消除文本中的 换行 的正则
const removeLineBreakReg = /[\r\n]/g;
// 消除文本中的 空格 的正则
const removeSpaceReg = /\s+/g;

function parseSingleClass (classStr: string) {
  // 解析以下2种情况的正则
  // 1. $style.wrap -> ['wrap']
  // 2. $style['wrap'] -> ['wrap']
  const reg = /\$style(?:\['(\w+)'\]|\.(\w+))/;

  const result = classStr.match(reg);
  if (!result) {
    return [];
  }

  const [, ...rest] = result;

  return rest.filter(Boolean);
};

function parseTernaryClass (classStr: string): string[] {
  return [];
};

function parseObjectClass (classStr: string) {
  // 解析以下情况
  // {[$style.content]:true,[$style.active]:active,[$style['text']]:true} -> ['content', 'text']
  const reg = /\[\$style(?:\['(\w+)'\]|\.(\w+))\]\:true/g;

  const result = [];
  let match = null;
  while (match = reg.exec(classStr)) {
    const [, ...rest] = match;
    result.push(...rest.filter(Boolean));
  }

  return result;
};

function parseArrayClass (classStr: string): string[] {
  // 去除[],并用,分割
  const classArr = classStr.slice(1, -1).split(/,(?=\{|\$|\w)/);

  return classArr.reduce((result, item) => {
    return result.concat(parseBindingClass(item));
  }, []);
};

function parseBindingClass (classStr: string): string[] {
  if (!classStr) {
    return [];
  }

  // 去除换行和空格
  classStr = classStr.replace(removeLineBreakReg, '').replace(removeSpaceReg, '');

  if (classStr.startsWith('$style')) {
    return parseSingleClass(classStr);
  }

  if (classStr.startsWith('{') && classStr.endsWith('}')) {
    return parseObjectClass(classStr);
  }

  if (classStr.startsWith('[') && classStr.endsWith(']')) {
    return parseArrayClass(classStr);
  }

  // 3元表达式
  if (classStr.includes('?')) {
    return parseTernaryClass(classStr);
  }

  return [];
};

function getInjectPosition(style: any) {
  const { start, end, content } = style;

  const startLine = content.slice(0, start).split('\n').length - 1; // zero-based
  const endLine = startLine + content.slice(start + 1, end).split('\n').length;

  return { start: startLine + 1, end: endLine };
}


export default async function generateStyleTree() {
  // 1. 获取内容
  const content = getCurrentFileContent();

  // 2. 解析内容
  const result = compiler.parseComponent(content, { pad: 'space', deindent: true });
  console.log('result', result);

  // 获取style行号
  const { styles } = result;

  if (styles.length === 0) {
    return vscode.window.showInformationMessage('当前文件没有style标签');
  }

  const injectPosition = getInjectPosition(styles[0]);

  const templateResult = compiler.compile(result.template.content);
  console.log('templateResult', templateResult);

  const { ast } = templateResult;
  console.log('ast', ast);

  // 3. 遍历 ast 进行剪枝，只保留具有class相关属性
  const filterAst = (ast: any) => {
    if (ast.type !== 1) {
      return null;
    }

    const { tag, attrsMap } = ast;

    const { class: staticClass, ':class': bindingClass } = attrsMap;

    const children = ast.children.map((child: any) => filterAst(child)).filter((child: any) => child);;

    return {
      tag,
      children,
      staticClass,
      bindingClass
    };
  };

  const filteredAst = filterAst(ast);
  console.log('filteredAst', filteredAst);

  // 4. 遍历 filteredAst，确定最终的选择器
  const handleAst = (ast: any) => {
    const { tag, staticClass, bindingClass, children } = ast;

    const classArray = parseStaticClass(staticClass);
    const bindingClassArray = parseBindingClass(bindingClass);

    const newClassArray = [ ...classArray, ...bindingClassArray ];

    const newChildren = children.map((child: any) => handleAst(child));

    const selector = newClassArray[0] ? `.${newClassArray[0]}` : tag;

    return {
      tag,
      class: newClassArray,
      children: newChildren,
      selector
    };
  };

  const handledAst = handleAst(filteredAst);
  console.log('handledAst', handledAst);

  // 5. 遍历根据 selector 生成 style string
  const generateStyleStr = (ast: any, indentLevel = 0) => {
    const { selector, children } = ast;

    const childrenStr = children.map((item: any) => {
      return generateStyleStr(item, indentLevel + 1);
    })
    .join('\n');

    const indent = '\t'.repeat(indentLevel);

    return ['', `${selector} {`, childrenStr, `}`].join(`\n${indent}`);
  };

  const styleStr = generateStyleStr(handledAst);
  console.log(styleStr);

  // 6. 确定最终插入的文本及位置
  const injectStyle = styleStr.replace(/^\n/, '') + '\n';
  console.log(injectPosition);

  insertSnippetByPosition(injectStyle, injectPosition);
}