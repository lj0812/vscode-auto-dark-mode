import * as vscode from 'vscode';
import { getConfig } from '../helpers/config.vscode';
import api from '../apis';
import $dts from '../helpers/generate-dts';
import type { CancellationToken } from 'vscode';

const YAPI_HOST = 'https://api.weizhipin.com';

const YAPI_SEARCH_RUL = `${YAPI_HOST}/common-page`;

const YAPI_UID_KEY = 'boss.yapi.uid';
const YAPI_TOKEN_KEY = 'boss.yapi.token';
const NO_YAPI_ERROR_MESSAGE = `请配置 ${YAPI_UID_KEY} 和 ${YAPI_TOKEN_KEY}`;

const checkYapiConfig = () => {
  const yapiUid = getConfig(YAPI_UID_KEY);
  const yapiToken = getConfig(YAPI_TOKEN_KEY);

  if (!yapiUid || !yapiToken) {
    vscode.window.showErrorMessage(NO_YAPI_ERROR_MESSAGE);
    return false;
  }

  return true;
};

const openYapiBrowser = (link: vscode.DocumentLink, path: string) => {
  if (!checkYapiConfig()) { return; }

  return api.searchApi({ q: path })
    .then((res: any) => {
      if (res.interface.length > 0) {
        const { _id, projectId } = res.interface[0];

        const result = vscode.Uri.parse(`${YAPI_HOST}/project/${projectId}/interface/api/${_id}`);
        link.target = result;
        return link;
      }
    });
};

function createWebviewContent(path: string) {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>yapi</title>
  </head>
  <body>
      <p>${path}</p>

      <script>
        function handleResponse(payload) {
          console.log(payload);
        }
      </script>

      <script>
        window.addEventListener('message', event => {
          const data = event.data;

          if (data.type === 'response') {
            handleResponse(data.payload);
          }
        });
      </script>

      <script>
        const vscode = acquireVsCodeApi();

        vscode.postMessage({
          type: 'request',
          payload: {
            method: 'searchApi',
            params: {
              q: '${path}'
            }
          }
        });
      </script>
  </body>
  </html>`;
}

const createYapiCommand = (context: vscode.ExtensionContext) => {
  let currentPanel: vscode.WebviewPanel | undefined = undefined;

  const postMessage = (message: any) => {
    currentPanel?.webview.postMessage(message);
  };

  const onMessage = (message: any) => {
    console.log('onMessage', message);
    const { type, payload } = message;

    if (type === 'request') {
      const { method, params } = payload;
      api[method](params).then((res: any) => {
        postMessage({ type: 'response', payload: res });
      });

    }
  };


  return (link: vscode.DocumentLink | string): undefined => {
    if (!checkYapiConfig()) { return; }

    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'yapi',
        'yapi',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      currentPanel.webview.html = createWebviewContent(link as string);
      currentPanel.webview.onDidReceiveMessage(onMessage, undefined, context.subscriptions);
      currentPanel.onDidDispose(
        () => {
          currentPanel = undefined;
        },
        undefined,
        context.subscriptions
      );
    }

    return;
  };
};

export const yapiCommand = {
  command: 'boss.open-yapi',
  callback: createYapiCommand
};

export default class Provider implements vscode.DocumentLinkProvider {
  static scheme = 'file';

  // range -> path
  private _pathMap = new Map<vscode.Range, string>();

  constructor() {
    console.log('YapiProvider constructor');
  }

  dispose() {
    // throw new Error('Method not implemented.');
  }

  provideDocumentLinks(document: vscode.TextDocument): vscode.ProviderResult<vscode.DocumentLink[] | undefined> {
    // 获取当前文档的所有文本内容
    const text = document.getText();

    const links: vscode.DocumentLink[] = [];
    const rulPathRegexp = /(?<=(['`"]))(\/[a-zA-Z0-9\-_]+){2,}(?:.json)?(?=\1)/g;
    let match;

    // 匹配所有接口路径
    while (match = rulPathRegexp.exec(text)) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);

      this._pathMap.set(range, match[0]);

      // const link = new vscode.DocumentLink(range);
      const link = new vscode.DocumentLink(range, vscode.Uri.parse(`${YAPI_SEARCH_RUL}?url=${match[0]}`));
      links.push(link);
    }

    return links;
  }

  resolveDocumentLink(link: vscode.DocumentLink, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink | undefined> {
    // 在这里实现链接跳转逻辑
    // 只有在 link.target 为 undefined 时才会调用该方法
    // 注意：如果 resolveDocumentLink 方法不返回值，则不能支持链接点击跳转
    const path = this._pathMap.get(link.range);

    // 打开yapi页面
    return openYapiBrowser(link, path);

    // 打开yapi webview
    // vscode.commands.executeCommand('boss.open-yapi', path);
    // return;
  }
}

const getResBodyByPath = async (path: string) => {
  try {
    const res = await api.searchApi({ q: path });
    if (res.interface.length === 0) {
      return '';
    }

    const { _id } = res.interface[0];

    const res2 = await api.getInterface({ id: _id });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { res_body } = res2;

    return res_body;
  } catch (error) {
    throw error;
  }
};

// 处理path,拆分不同部分
const handlePath = (path: string) => {
  const pathArr = path.split('/').filter(Boolean);

  const [prefix, project, ...paths] = pathArr;

  // prefix 转换成大写
  const prefixUpperCase = prefix.toUpperCase();
  // project 首字母大写
  const projectUpperCase = project.substring(0, 1).toUpperCase() + project.substring(1);
  // paths 用.连接
  const pathsStr = paths.join('.');
  // t
  const t = [prefixUpperCase, projectUpperCase, pathsStr].join('.');

  return {
    prefix,
    project,
    paths,
    t
  };
};

const getDtsFilePath = (path: string, currentFilePath: string, { generateMode = 'directory', customPath = 'src/types/apis', customMethod = 'unified' }) => {
  const { prefix, project, paths } = handlePath(path);

  const rootUri = vscode.workspace.workspaceFolders?.[0].uri;
  const rootDir = vscode.workspace.workspaceFolders?.[0].name;
  console.log('rootDir', rootUri, rootDir);

  // 获取当前目录相对于根目录的路径
  const dirPaths = currentFilePath.split('/').filter(Boolean);
  const index = dirPaths.indexOf(rootDir);
  const currentDirPath = dirPaths.slice(index + 1, -1).join('/');
  console.log('currentDirPath', currentDirPath);

  const currentFileName = currentFilePath.split('/').pop();
  console.log('currentFileName', currentFileName);
  // 获取 currentFileName 除去 .ts 后缀的文件名
  const currentFileNameWithoutSuffix = currentFileName?.split('.').slice(0, -1).join('.');
  console.log('currentFileNameWithoutSuffix', currentFileNameWithoutSuffix);


  // 生成dts文件
  // 以当前文件为index.ts为模板,index.ts的路径为 根路径/src/apis/ios/index.ts
  // 当generateMode为sameName时，生成的dts文件为 ./index.d.ts
  // 当generateMode为unified时，生成的dts文件名为 ./types.d.ts
  // 当generateMode为directory时，生成的dts文件为 ./types/index.d.ts
  // 当generateMode为custom时，获取customPath 和 customMethod
  // customPath 为相对于根目录的路径
  // customMethod为自定义方法，分别为 "interface","file","unified"
  // customMethod为interface时，生成的dts文件为 根路径/${customPath}/${prefix}${project}.d.ts
  // customMethod为file时，生成的dts文件为 根路径/${customPath}/ios/index.d.ts
  // customMethod为unified时，生成的dts文件为 根路径/${customPath}/types.d.ts

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
          dtsFilePath = `${customPath}/${prefix}_${project}/${paths[0]}.d.ts`;
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

const generateDtsContent = (t: string, dts: string) => {
  return `declare namespace ${t} {
    ${dts}
}`;
};

// 获取文件内指定文本的位置
const getRangeByContent = (document: vscode.TextDocument, content: string) => {
  const text = document.getText();
  const index = text.indexOf(content);
  const position = document.positionAt(index);
  const range = new vscode.Range(position, position.with({ line: position.line + 1 }));

  return range;
};

// 查看文件是否包含指定文本
const includeContent = async (uri: vscode.Uri, content: string) => {
  const fileContent = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(fileContent).toString();
  return text.includes(content);
};


export async function generateDTS() {
  if (!checkYapiConfig()) { return; }

  console.log('generateDTS');
  // 1、获取光标所在行的文本
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const selection = editor.selection;
  const lineOfSelectedVar = selection.active.line;
  const line = document.lineAt(lineOfSelectedVar);
  const text = line.text;

  // 2、获取接口路径
  const rulPathRegexp = /(?<=(['`"]))(\/[a-zA-Z0-9\-_]+){2,}(?:.json)?(?=\1)/g;
  const match = rulPathRegexp.exec(text);
  if (!match) {
    return;
  }

  const interfacePath = match[0];

  // loading
  let loading: null | { cancel: () => void } = null;
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: '正在生成dts...',
    cancellable: false
  }, (progress, token) => {
    token.onCancellationRequested(() => {
      vscode.window.showInformationMessage('已取消');
    });

    const p = new Promise<void>(async resolve => {
      loading = { cancel: resolve };
    });

    return p;
  });
  // 3、获取接口数据
  const resBody = await getResBodyByPath(interfacePath);

  if (loading) {
    loading.cancel();
  }


  if (!resBody) {
    vscode.window.showErrorMessage('未找到接口数据');
    return;
  }
  const dtsDom = $dts(resBody);

  const dts = dtsDom
    .replace(/<br\s?\/?>/g, '\n')
    .replace(/&nbsp;&nbsp;/g, '  ')
    .replace(/<\/?[^>]*>/g, '');

  const dtsArr = dts.split('\n\n');
  const finalDtsArr = dtsArr.length === 1 ? dtsArr : dtsArr.slice(1);
  const finalDts = finalDtsArr.join('\n\n').trim();

  // 将dts写入剪切板
  vscode.env.clipboard.writeText(finalDts);
  vscode.window.showInformationMessage('dts已复制到剪切板');

  // 4、处理dts
  const generate = getConfig('boss.dts.generate');

  if (!generate) {
    return;
  }

  // 5、将接口声明替换为接口名称
  const { t } = handlePath(interfacePath);
  editor.edit((editBuilder) => {
    editBuilder.replace(selection, `<${t}>`);
  });

  // 6、写入dts文件
  const generateMode = getConfig('boss.dts.generateMode') as string;
  const customPath = getConfig('boss.dts.customPath') as string;
  const customMethod = getConfig('boss.dts.customMethod') as string;

  const { rootUri, dtsFilePath } = getDtsFilePath(interfacePath, document.fileName, { generateMode, customPath, customMethod });
  if (!dtsFilePath) {
    return;
  }

  const targetUri = vscode.Uri.joinPath(rootUri, dtsFilePath);
  // 检查路径文件是否存在
  try {
    await vscode.workspace.fs.stat(targetUri);

    // 文件存在，检查文件是否包含dts内容
    const exit = await includeContent(targetUri, t);
    if (exit) {
      vscode.window.showInformationMessage(`dts文件已存在 ${t} 声明`);
      await document.save();
      return;
    }

  } catch (error) {
    // 文件不存在，创建文件
    await vscode.workspace.fs.writeFile(targetUri, new Uint8Array());
  }

  // 生成写入dts内容
  const content = generateDtsContent(t, finalDts);

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
  // await dtsDocument.save();
  await vscode.commands.executeCommand('workbench.action.files.save');
  // await vscode.commands.executeCommand('workbench.action.closeActiveEditor');


  // 聚焦到当前正在操作的文档
  await vscode.window.showTextDocument(document);

  // 保存当前文件
  await document.save();

  // 7、提示文件保存位置
  vscode.window.showInformationMessage(`dts文件已保存到 ${dtsFilePath}`);
}