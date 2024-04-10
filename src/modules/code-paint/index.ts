import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { darkenColor } from '@/utils';

const REGEX_PATTERN = /\/\/\s*---------<>\s*([^|]+)?(?: \| ((?:rgba?\((?:\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0?\.\d+|1))?\)))|#(?:[a-fA-F0-9]{6}|[a-fA-F0-9]{3})) )?<>---------\s*\n([\s\S]*?)\n\s*\/\/\s*---------<\/>\s*\1\s*<\/>---------/g;
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


export function activate(context: vscode.ExtensionContext) {
  const visibleTextEditors = vscode.window.visibleTextEditors;

  const setEditorDecorations = (editors: readonly vscode.TextEditor[]) => {
    editors.forEach(updateDecorations);
  };

  setEditorDecorations(visibleTextEditors);
  const disposable = vscode.window.onDidChangeVisibleTextEditors(setEditorDecorations);

  const disposable2 = vscode.workspace.onDidChangeTextDocument(() => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      updateDecorations(editor);
    }
  });

  context.subscriptions.push(disposable, disposable2);
}