import * as vscode from 'vscode';

const THEME_FILE_PATH = 'bs.css.variables';

export const getThemePathConfig = (): string => {
  const config: string = vscode.workspace.getConfiguration().get(THEME_FILE_PATH) || '';

  if (!config) {
    vscode.window.showErrorMessage(`请配置CSS变量文件路径：${THEME_FILE_PATH}`, { modal: true });
  }

  return config;
};