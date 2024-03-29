import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getThemePathConfig } from './config.vscode';
import { VueComplierStyle, Position} from '../types';

export const getCurrentFileContent = (): string => {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return '';
  }
  return activeEditor.document.getText();
};

export const getWorkspaceRoot = () => {
  const { workspaceFolders } = vscode.workspace;

  const rootPath = workspaceFolders ? workspaceFolders[0].uri.path : '';
  return rootPath;
};

export const getThemeFileContent = () => {
  try {
    const pathStr = getThemePathConfig();

    const paths = pathStr.split(',');
    const root = getWorkspaceRoot();

    const result = paths
      .map(_ => {
        const fsPath = path.resolve(root, _);
        const content = fs.readFileSync(fsPath, { encoding: 'utf-8' });

        return content;
      })
      .join('\n');

    return result;
  } catch (error) {
    vscode.window.showErrorMessage('CSS变量文件目录不正确');
    return '';
  }
};

export const insertSnippet = (style: VueComplierStyle) => {
  // vscode.window.activeTextEditor.insertSnippet(new vscode.SnippetString('\n' + style.value + '\n'), new vscode.Position(style.endLine + 1, 0));
  const [start, end] = style.injectLocation;
  const injectRange = new vscode.Range(start, 0, end, 0);

  vscode.window.activeTextEditor.insertSnippet(new vscode.SnippetString(style.value), injectRange, { undoStopBefore: false, undoStopAfter: false });
};

export const insertSnippetByPosition = (style: string, position: Position) => {
  // vscode.window.activeTextEditor.insertSnippet(new vscode.SnippetString('\n' + style.value + '\n'), new vscode.Position(style.endLine + 1, 0));
  const {start, end} = position;
  const injectRange = new vscode.Range(start, 0, end, 0);

  vscode.window.activeTextEditor.insertSnippet(new vscode.SnippetString(style), injectRange, { undoStopBefore: false, undoStopAfter: false });
};