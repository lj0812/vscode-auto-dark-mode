import * as vscode from 'vscode';

const THEME_FILE_PATH = 'boss.css.variables';
const SAVE_UNCONVERTED_COLOR = 'boss.css.saveUnconvertedColor';

export const getThemePathConfig = (): string => {
  const config: string = vscode.workspace.getConfiguration().get(THEME_FILE_PATH) || '';

  if (!config) {
    vscode.window.showErrorMessage(`请配置CSS变量文件路径：${THEME_FILE_PATH}`, { modal: true });
  }

  return config;
};

export const getSaveUnconvertedColorConfig = (): boolean => {
  const config: boolean = vscode.workspace.getConfiguration().get(SAVE_UNCONVERTED_COLOR) || false;
  return config;
};

export const getConfig = (key: string) => {
  const config = vscode.workspace.getConfiguration().get(key);
  return config;
};

/** 获取当前文件的缩进配置 */
export const getFileIndentation = () => {
  const editor = vscode.window.activeTextEditor;
  console.log('editor.options', editor.options);
  const indentation = editor?.options.tabSize || 2;
  return indentation;
};