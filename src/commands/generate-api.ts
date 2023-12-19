import { getConfig } from '../helpers/config.vscode';
import * as vscode from 'vscode';
import { getFileIndentation } from '../helpers/config.vscode';
import { capitalize } from '../utils';

import { generateApiListByCategoryId, generateApiById } from '../core/auto-api';

const getUserInput = async () => {
  return vscode.window.showInputBox({
    placeHolder: '请输入id'
  });
};

// 查看文件是否包含指定文本
const includeContent = async (uri: vscode.Uri, content: string) => {
  const fileContent = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(fileContent).toString();
  return text.includes(content);
};

// 处理path,拆分不同部分
const handlePath = (path: string, aliasMap: Record<string, string> = {}) => {
  const pathArr = path.split('/').filter(Boolean);

  const [prefix, project, ...paths] = pathArr;

  // prefix 转换成大写
  const prefixUpperCase = prefix.toUpperCase();
  // project 首字母大写
  const projectUpperCase = capitalize(project);
  // paths 用.连接
  const pathsStr = capitalize(paths.join('.'));
  // t
  let t = [prefixUpperCase, projectUpperCase, pathsStr].join('.');

  const replaceList = Object.entries(aliasMap);
  replaceList.forEach(([key, value]) => {
    t = t.replace(key, value);
  });

  return {
    prefix,
    project,
    paths,
    t
  };
};

const getDtsFilePath = (
  path: string,
  currentFilePath: string,
  {
    generateMode = 'directory',
    customPath = 'src/types/apis',
    customMethod = 'unified',
    dirSeparator = '-'
  }
) => {
  const { prefix, project, paths } = handlePath(path);

  const rootUri = vscode.workspace.workspaceFolders?.[0].uri;
  const rootDir = vscode.workspace.workspaceFolders?.[0].name;

  // 获取当前目录相对于根目录的路径
  const dirPaths = currentFilePath.split('/').filter(Boolean);
  const index = dirPaths.indexOf(rootDir);
  const currentDirPath = dirPaths.slice(index + 1, -1).join('/');

  const currentFileName = currentFilePath.split('/').pop();
  // 获取 currentFileName 除去 .ts 后缀的文件名
  const currentFileNameWithoutSuffix = currentFileName?.split('.').slice(0, -1).join('.');

  if (generateMode === 'custom' && !customPath) {
    vscode.window.showErrorMessage('请配置 boss.dts.customPath');
    return {
      rootUri,
      rootDir,
      dtsFilePath: ''
    };
  }

  let dtsFilePath = '';

  switch (generateMode) {
    case 'sameName':
      dtsFilePath = `${currentDirPath}/${currentFileNameWithoutSuffix}.d.ts`;
      break;
    case 'unified':
      dtsFilePath = `${currentDirPath}/types.d.ts`;
      break;
    case 'directory':
      dtsFilePath = `${currentDirPath}/types/${currentFileNameWithoutSuffix}.d.ts`;
      break;
    case 'custom':
      switch (customMethod) {
        case 'interface':
          // dtsFilePath = `${customPath}/${prefix}${dirSeparator}${project}/${paths[0]}.d.ts`;
          dtsFilePath = `${customPath}/${paths[0]}.d.ts`;
          break;
        // case 'file':
        //   dtsFilePath = `${customPath}/${prefix}/${project}/index.d.ts`;
          break;
        case 'unified':
          dtsFilePath = `${customPath}/types.d.ts`;
          break;
        default:
          break;
      }

      break;
    default:
      break;
  }

  return {
    rootUri,
    rootDir,
    dtsFilePath
  };
};

const writeFile = async(interfacePath: string, type: any, content: any) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;
  // 6、写入dts文件
  const generateMode = getConfig('boss.dts.generateMode') as string;
  const customPath = getConfig('boss.dts.customPath') as string;
  const customMethod = getConfig('boss.dts.customMethod') as string;
  const dirSeparator = getConfig('boss.dts.dirSeparator') as string;

  const { rootUri, dtsFilePath } = getDtsFilePath(interfacePath, document.fileName, { generateMode, customPath, customMethod, dirSeparator });
  if (!dtsFilePath) {
    return;
  }

  const targetUri = vscode.Uri.joinPath(rootUri, dtsFilePath);
  // 检查路径文件是否存在
  try {
    await vscode.workspace.fs.stat(targetUri);

    // 文件存在，检查文件是否包含dts内容
    const exit = await includeContent(targetUri, type.root);
    if (exit) {
      vscode.window.showInformationMessage(`dts文件已存在 ${type.root} 声明`);
      await document.save();
      return;
    }

  } catch (error) {
    // 文件不存在，创建文件
    await vscode.workspace.fs.writeFile(targetUri, new Uint8Array());
  }

  // 生成写入dts内容
  // 后台静默将内容追加到文件末尾，并格式化
  const dtsEditor = await vscode.window.showTextDocument(targetUri, { preserveFocus: true });
  const dtsDocument = dtsEditor.document;
  const lastLine = dtsDocument.lineAt(dtsDocument.lineCount - 1);
  const position = new vscode.Position(dtsDocument.lineCount - 1, lastLine.text.length);
  const range = new vscode.Range(position, position);
  dtsEditor.edit((editBuilder) => {
    const finalContent = dtsDocument.getText().trim() ? `\n\n${content}` : content;
    editBuilder.replace(range, finalContent);
  });

  // 格式化、保存文件、回到原文件
  await vscode.commands.executeCommand('editor.action.formatDocument');
  await vscode.commands.executeCommand('workbench.action.files.save');


  // 聚焦到当前正在操作的文档
  await vscode.window.showTextDocument(document);

  // 保存当前文件
  await document.save();

  // 7、提示文件保存位置
  vscode.window.showInformationMessage(`dts文件已保存到 ${dtsFilePath}`);
};

function insertText(content: string) {
  // 1、获取光标所在行的文本
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const selection = editor.selection;
  const lineOfSelectedVar = selection.active.line;
  const line = document.lineAt(lineOfSelectedVar);
  // const text = line.text;

  editor.edit((editBuilder) => {
    editBuilder.replace(selection, content);
  });
}

export default async () => {
  console.log('generate-api');

  const userInput = await getUserInput();

  if (!userInput) {
    return;
  }

  const indent = getFileIndentation();
  const indentStr = ' '.repeat(+indent);

  let apiStr = '';

  if (userInput.startsWith('cat_')) {
    const categoryId = userInput.replace('cat_', '');

    const apiData = await generateApiListByCategoryId(categoryId, indentStr);
    apiStr = apiData.apiStr;

    insertText(apiStr);

    const apiList = apiData.apiList;
    const responseTypes = apiData.responseTypes;

    const list = apiList.map(async (item, index) => {
      await writeFile(item.path, item.funcType, responseTypes[index]);
    });

    await Promise.all(list);

    return;
  }

  const apiData = await generateApiById(userInput, indentStr);
  apiStr = apiData.apiStr;
  const responseType = apiData.responseType;
  insertText(apiStr);

  writeFile(apiData.path, apiData.funcType, responseType);
};

