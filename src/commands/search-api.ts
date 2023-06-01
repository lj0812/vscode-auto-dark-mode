import * as vscode from 'vscode';
import { getConfig } from '../helpers/config.vscode';
import api from '../apis';

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
