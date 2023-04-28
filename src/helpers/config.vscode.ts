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