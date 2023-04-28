import * as vscode from 'vscode';

export default class Provider implements vscode.DocumentLinkProvider {
  static scheme = 'file';

  constructor() {
    console.log('YapiProvider constructor');
  }

  dispose() {
    // throw new Error('Method not implemented.');
  }

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] | undefined {
    // 获取当前文档的所有文本内容
    const text = document.getText();

    const links: vscode.DocumentLink[] = [];
    const rulPathRegexp = /(?<=['`"])(\/[a-zA-Z0-9\-]+){2,}(?:.json)?(?=['`"])/g;
    let match;

    // 匹配所有接口路径
    while (match = rulPathRegexp.exec(text)) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);

      const link = new vscode.DocumentLink(range, vscode.Uri.parse(`http://172.16.10.201:3000/common-page?url=${match[0]}`));
      links.push(link);
    }

    return links;
  }

  resolveDocumentLink(link: vscode.DocumentLink, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink> {
    // 在这里实现链接跳转逻辑
    // 注意：如果 resolveDocumentLink 方法不返回值，则不能支持链接点击跳转
    const uri = link.target;
    vscode.env.openExternal(uri);
    return link;
  }
}
