import * as vscode from 'vscode';

// 声明
type Delimiter = string | ((text: string) => string);
type StringObject = {
  [key: string]: string;
};
// key: string, value: string | function
type DelimiterObject = {
  [key: string]: Delimiter;
};
// key: string, value: function
type CursorObject = {
  [key: string]: number;
};

// 判断当前文件类型
function fileType(): string {
  const editor = vscode.window.activeTextEditor;
  const document = editor.document;
  return document.languageId;
}

const commentDelimiterMap: DelimiterObject = {
  doubleSlash: '//',
  html: (text: string) => {
    return `<!-- ${text} -->`;
  },
  slashStar: (text: string) => {
    return `/* ${text} */`;
  },
  slashDoubleStar: (text: string) => {
    return `/** ${text} */`;
  },
  hash: '#',
  semicolon: ';',
};

// 根据偏移量获取新的光标位置
function getNewCursor(line: number, column: number, offset: number): vscode.Selection {
  return new vscode.Selection(
    new vscode.Position(line, column + offset),
    new vscode.Position(line, column + offset),
  );
}

// 不同注释光标修正: 最后位置往前修正
const commentCursorOffsetMap: CursorObject = {
  doubleSlash: 0,
  html: -4,
  slashStar: -3,
  slashDoubleStar: -3,
  hash: 0,
  semicolon: 0,
};


const languageIdMap: StringObject = {
  javascript: 'doubleSlash',
  typescript: 'slashDoubleStar',
  html: 'html',
  css: 'slashStar',
  less: 'slashStar',
  scss: 'slashStar',
  stylus: 'slashStar',
};

// lang2id
const lang2LanguageIdMap: StringObject = {
  js: 'javascript',
  ts: 'typescript',
  html: 'html',
  css: 'css',
  less: 'less',
  scss: 'scss',
  stylus: 'stylus',
};

// 根据文件类型获取注释符号
// TODO: 用户可以自定义注释符号，所以才需要判断flagText之前的文本来判断是否是行注释
const getLanguageDelimiter = (languageId: string) => {
  const delimiterName = languageIdMap[languageId];
  return commentDelimiterMap[delimiterName];
};

// 判断是否是行注释
function isLineComment(text: string, languageId: string) {
  const delimiter = getLanguageDelimiter(languageId);

  const flagText = '|';
  const mockComment = generateCommentText(flagText, delimiter);
  // 获取flagText之前的文本
  const textBeforeFlagText = mockComment.split(flagText)[0];

  return text.trim().startsWith(textBeforeFlagText);
}


// 获取不同文件类型的注释符号
function generateCommentText(text: string, delimiter: Delimiter = commentDelimiterMap.doubleSlash) {
  if (typeof delimiter === 'function') {
    return delimiter(text);
  }
  return `${delimiter} ${text}`;
}

function getUncommentedText(commentedText: string, delimiter: Delimiter) {
  if (typeof delimiter === 'string') {
    return commentedText.slice(delimiter.length).trim();
  }

  const flagText = '\uFFFF';
  const delimiterText = delimiter(flagText);
  const [startSymbol, endSymbol] = delimiterText.split(flagText).filter((s: string) => s !== '');

  if (endSymbol) {
    const endIndex = commentedText.lastIndexOf(endSymbol);
    return commentedText.slice(startSymbol.length, endIndex).trim();
  }

  return commentedText.slice(startSymbol.length).trim();
}

// 切换注释功能，注释和取消注释
function toggleComment(languageId: string) {
  const editor = vscode.window.activeTextEditor;
  const document = editor.document;

  // 获取光标所在行的文本
  const line = editor.selection.active.line;
  const text = document.lineAt(line).text;

  // 获取光标所在列
  const column = editor.selection.active.character;
  // 获取光标距离行尾的距离
  const distanceToLineEnd = text.length - column;

  // 获取第一个非空字符的位置
  const firstNonWhitespaceCharacterIndex = Math.max(text.search(/\S/), 0);

  // 注释符号名称
  const delimiterName = languageIdMap[languageId];

  // 获取注释符号
  const delimiter = getLanguageDelimiter(languageId);

  // 是否已经注释
  const hasComment = isLineComment(text, languageId);

  const textHandleFn = hasComment ? getUncommentedText : generateCommentText;
  const handledText = textHandleFn(text.trimStart(), delimiter);

  // 计算插入注释后的文本末尾位置
  const endColumn = firstNonWhitespaceCharacterIndex + handledText.length;

  // 插入注释
  editor.edit((editBuilder) => {
    // 删除当前行的文本
    editBuilder.delete(new vscode.Range(
      new vscode.Position(line, firstNonWhitespaceCharacterIndex),
      new vscode.Position(line, text.length),
    ));

    // 插入注释
    editBuilder.insert(new vscode.Position(line, firstNonWhitespaceCharacterIndex), handledText);
  });

  const cursorGap = commentCursorOffsetMap[delimiterName];
  const curSorOffset = hasComment ? -cursorGap : cursorGap;


  // 移动光标到合适的位置
  const newCursor = getNewCursor(line, endColumn, curSorOffset - distanceToLineEnd);
  editor.selection = newCursor;
}

function getRange(text: string, startTag: string, endTag: string) {
  // text为多行文本，使用[\s\S]匹配任意字符，包括换行符
  const reg = new RegExp(`${startTag}([\\s\\S]*)${endTag}`);
  const matchResult = text.match(reg);
  if (matchResult) {
    const startLine = text.slice(0, matchResult.index).split('\n').length - 1;
    const endLine = startLine + matchResult[0].split('\n').length - 1;
    return {
      startLine,
      endLine,
    };
  }
}

// 获取当前光标所在的语言类型
// TODO: 不够准确，比如 vue template中的js代码，会被识别为html
function getCursorLanguageId() {
  // 解析当前文件，获取到当前文件的内容
  const editor = vscode.window.activeTextEditor;
  const document = editor.document;

  // 获取当前光标所在行
  const cursorLine = editor.selection.active.line;

  const text = document.getText();

  const textLines = text.split('\n').slice(0, cursorLine + 1);

  let lang = '';

  // 倒序遍历，找到第一个script或style标签或template标签
  for (let i = textLines.length - 1; i >= 0; i--) {
    const lineText = textLines[i];

    if (lineText.includes('<script') || lineText.includes('<style') || lineText.includes('<template')) {
      if (i === cursorLine) {
        lang = 'html';
        break;
      }
    }

    if (lineText.includes('<script')) {
      lang = lineText.match(/<script.*lang=(['"])(.*)\1.*>/)?.[2] || 'js';
      break;
    }
    if (lineText.includes('<style')) {
      lang = lineText.match(/<style.*lang=(['"])(.*)\1.*>/)?.[2] || 'css';
      break;
    }
    if (lineText.includes('<template')) {
      lang = lineText.match(/<template.*lang=(['"])(.*)\1.*>/)?.[2] || 'html';
      break;
    }
  }

  return lang2LanguageIdMap[lang];
}


// 自定义注释功能
export default async function customComment() {
  console.log('done');
  // 1. 判断当前文件类型
  let type = fileType();
  console.log("🚀 ~ file: custom-comment.ts:19 ~ customComment ~ type:", type);

  if (type === 'vue') {
    type = getCursorLanguageId();
  }

  // 判断当前文件类型是否支持
  if (!languageIdMap[type]) {
    return;
  }

  // 2. 针对不同文件类型，进行不同的处理
  toggleComment(type);
}