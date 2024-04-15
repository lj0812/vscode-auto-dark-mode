import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { darkenColor, wrapComment } from '@/utils';

const REGEX_PATTERN = /.*-{10}<>\s*([^|]*)(?:\s*\|?\s*((?:rgba?\((?:\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0?\.\d+|1))?\)))|#(?:[a-fA-F0-9]{6}|[a-fA-F0-9]{3}))\s*)?<>-{10}.*\n(?:([\s\S]*)\n)?.*-{10}<\/>\s*\1\s*<\/>-{10}/g;
const fileDecorationTypeList: Map<string, vscode.TextEditorDecorationType[]> = new Map();

const getUnionKey = (editor: vscode.TextEditor) => {
  const uri = editor.document.fileName;
  const viewColumn = editor.viewColumn;

  const unionKey = `${uri}-${viewColumn}`;

  return unionKey;
};

const resetDecoration = (unionKey: string) => {
  const oldDecorationTypeList = fileDecorationTypeList.get(unionKey);

  if (oldDecorationTypeList) {
    oldDecorationTypeList.forEach(decorationType => {
      decorationType.dispose();
    });

    fileDecorationTypeList.delete(unionKey);
  }
};

const addDecoration = (unionKey: string, decoration: vscode.TextEditorDecorationType) => {
  if (!fileDecorationTypeList.has(unionKey)) {
    fileDecorationTypeList.set(unionKey, []);
  }

  fileDecorationTypeList.get(unionKey)?.push(decoration);
};

function getThemeColor() {
  try {
    const extensions = vscode.extensions.all;

    const themeExtensions = extensions.filter(item => item.packageJSON.contributes?.themes);

    const colorTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');

    let matchedTheme: { path: string } | null;
    const matchedExtension = themeExtensions.find(item => {
      const themes = item.packageJSON.contributes.themes;

      matchedTheme = themes.find((theme: any) => theme?.id === colorTheme || theme.label === colorTheme);

      return !!matchedTheme;
    });

    const extensionPath = matchedExtension?.extensionPath;

    const themePath = matchedTheme!.path;

    const themeContent = fs.readFileSync(path.join(extensionPath, themePath), 'utf-8');

    const theme = JSON.parse(themeContent);

    const colors = theme.colors;

    return colors;
  } catch (error) {
    return {};
  }
}

function getBackgroundColor() {
  try {
    const colors = getThemeColor();

    const background = colors['editor.background'];

    return background;
  } catch (error) {
    console.log('error', error);
  }
}

const darkenBgColor = (() => {
  try {
    const bg = getBackgroundColor();

    return darkenColor(bg, 3);
  } catch (error) {
    return '#01363D';
  }
})();

const findCodePaintBlock = (editor: vscode.TextEditor) => {
  const text = editor.document.getText();

  const list = [];

  let match: RegExpExecArray | null;

  while ((match = REGEX_PATTERN.exec(text))) {
    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.positionAt(match.index + match[0].length);
    const decoration = { range: new vscode.Range(startPos, endPos) };

    list.push({
      decoration,
      backgroundColor: match[2]?.trim() || darkenBgColor// 设置背景色
    });
  }

  return list;
};

function updateDecorations(editor: vscode.TextEditor) {
  try {
    const unionKey = getUnionKey(editor);

    resetDecoration(unionKey);

    const list = findCodePaintBlock(editor);

    list.forEach(({ decoration, backgroundColor }) => {
      const decorationType = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor,
      });

      editor.setDecorations(decorationType, [decoration]);

      addDecoration(unionKey, decorationType);
    });
  } catch (error) {

  }
}

function getSFCBlockRanges(text: string): {
  template: { start: number, end: number }[],
  script: { start: number, end: number }[],
  style: { start: number, end: number }[]
} {
  const templateRegex = /(?:^|\n)<template\b[^>]*>([\s\S]*?)(?:^|\n)<\/template>/g;
  const scriptRegex = /(?:^|\n)<script\b[^>]*>([\s\S]*?)(?:^|\n)<\/script>/g;
  const styleRegex = /(?:^|\n)<style\b[^>]*>([\s\S]*?)(?:^|\n)<\/style>/g;

  const result: {
    template: { start: number, end: number }[],
    script: { start: number, end: number }[],
    style: { start: number, end: number }[]
  } = {
    template: [],
    script: [],
    style: []
  };

  let match: RegExpExecArray | null;

  // 匹配 <template> 块
  while ((match = templateRegex.exec(text)) !== null) {
    const start = 0 === match.index ? 0 : text.substring(0, match.index).split('\n').length;
    const end = start + match[1].split('\n').length;
    result.template.push({ start, end });
  }

  // 匹配 <script> 块
  while ((match = scriptRegex.exec(text)) !== null) {
    const start = 0 === match.index ? 0 : text.substring(0, match.index).split('\n').length;
    const end = start + match[1].split('\n').length;
    result.script.push({ start, end });
  }

  // 匹配 <style> 块
  while ((match = styleRegex.exec(text)) !== null) {
    const start = 0 === match.index ? 0 : text.substring(0, match.index).split('\n').length;
    const end = start + match[1].split('\n').length;
    result.style.push({ start, end });
  }

  return result;
}

const getBlockType = (range: { start: number, end: number }, blockRanges: Record<string, { start: number, end: number }[]>) => {
  for (const key in blockRanges) {
    const ranges = blockRanges[key];
    for (const item of ranges) {
      if (range.start > item.start && range.end < item.end) {
        return key;
      }
    }
  }

  return 'template';
};

// 注册右键菜单命令
export function registerCodePaintCommand(context: vscode.ExtensionContext) {
  const colorCodeCommand = vscode.commands.registerCommand('boss.code-paint', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const selection = editor.selection;

      // 获取选中文本
      const selectedText = document.getText(selection);

      if (!selectedText) {
        vscode.window.showInformationMessage('请先选中文本');
        return;
      }

      // 获取文档的总行数
      const totalLine = document.lineCount;

      // 获取文档的语言类型
      let languageId = document.languageId;

      const { start, end } = selection;
      const endLine = end.line;

      // 如果是 vue 文件，需要获取 <template>、<script>、<style> 块的范围
      if (languageId === 'vue') {
        const text = document.getText();
        const ranges = getSFCBlockRanges(text);
        // 匹配 selection 在哪个块中
        const matchBlock = getBlockType({ start: start.line, end: endLine }, ranges);

        languageId = matchBlock;
      }

      // 获取 start.line 行第一个不为空字符的位置
      const line = document.lineAt(start.line);
      const firstNonSpace = line.firstNonWhitespaceCharacterIndex;

      const spaceStr = ' '.repeat(firstNonSpace);

      // 添加注释
      const startFlag = wrapComment('----------<>  <>----------', languageId);
      const endFlag = wrapComment('----------</>  </>----------', languageId);

      // 替换选中的文本
      editor.edit(editBuilder => {
        // 如果选中的包含文件最后一行，需要在最后一行下面添加空行
        if (endLine === totalLine - 1) {
          editBuilder.insert(new vscode.Position(endLine + 1, 0), '\n');
        }

        editBuilder.insert(new vscode.Position(endLine + 1, 0), spaceStr + endFlag + '\n');
        editBuilder.insert(new vscode.Position(start.line, firstNonSpace), startFlag + '\n' + spaceStr);
      });
    }
  });

  context.subscriptions.push(colorCodeCommand);
}

export function activate(context: vscode.ExtensionContext) {
  const visibleTextEditors = vscode.window.visibleTextEditors;

  const setEditorDecorations = (editors: readonly vscode.TextEditor[]) => {
    editors.forEach(updateDecorations);
  };

  setEditorDecorations(visibleTextEditors);
  const disposable = vscode.window.onDidChangeVisibleTextEditors((textEditors) => {
    if (textEditors.length === 2) {
      const sameFile = textEditors[0].document.fileName === textEditors[1].document.fileName
        && textEditors[0].viewColumn === textEditors[1].viewColumn;

      // 推测此时为 git diff 模式，不需要重新设置装饰
      if (sameFile) {
        return;
      }
    }

    setEditorDecorations(textEditors);
  });

  const disposable2 = vscode.workspace.onDidChangeTextDocument(() => {
    const editor = vscode.window.activeTextEditor;

    // 推测此时为 git diff 模式，不需要重新设置装饰
    if (editor.viewColumn === undefined) {
      return;
    }

    if (editor) {
      updateDecorations(editor);
    }
  });

  context.subscriptions.push(disposable, disposable2);

  registerCodePaintCommand(context);
}