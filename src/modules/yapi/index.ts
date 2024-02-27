import * as vscode from 'vscode';
import { getConfig } from '@/helpers/config.vscode';
import { searchApi, getInterfaceById } from '@/apis/yapi';

const WEBVIEW_DIR = 'webview';
const WEBVIEW_ASSETS_DIR = 'assets';
const WEBVIEW_ENTRY_FILE = 'yapi-list.html';

const YAPI_HOST = 'https://api.weizhipin.com';
const YAPI_SEARCH_RUL = `${YAPI_HOST}/common-page`;

interface SendMessage {
	type: string;
	params?: any;
	data?: any;
}

class YapiWebviewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'yapi.interface.one';

	#view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri
	) {

	}

	public async resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this.#view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, WEBVIEW_DIR, WEBVIEW_ASSETS_DIR)
			]
		};

		webviewView.webview.html = await this.updateWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(this.onMessage);
		webviewView.onDidDispose(
			() => {
				this.#view = undefined;
			},
		);

		this.postMessage({
			type: 'sync-data'
		});
	}

	public onMessage() {

	}

	public postMessage(data: SendMessage) {
		console.log('--postMessage--', data, this.#view);
		if (!this.#view) {
			return;
		}

		this.#view.webview.postMessage({
			...data
		});
	}

	public async updateWebview(webview: vscode.Webview) {
		const fileUri = vscode.Uri.joinPath(this._extensionUri, WEBVIEW_DIR, WEBVIEW_ENTRY_FILE);

		const content = await vscode.workspace.fs.readFile(fileUri);
		const contentStr = Buffer.from(content).toString('utf-8');

		const htmlStr = contentStr
			.replaceAll('src="/', `src="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, WEBVIEW_DIR))}/`)
			.replaceAll('href="/', `href="${webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, WEBVIEW_DIR))}/`);

		return htmlStr;
	};

	// 打开 webview
	public async openWebview(path: string) {
		console.log('openWebview', path);
		void vscode.commands.executeCommand('workbench.view.extension.yapi');
		const res = await getInterfaceByPath(path);

		this.#view?.show();
		this.postMessage({
			type: 'api-data',
			data: res
		});
	}

}

class YapiLinkProvider implements vscode.DocumentLinkProvider {
	public static readonly scheme = 'file';

	// range -> path
	#pathMap = new Map<vscode.Range, string>();
	#webviewProvider: YapiWebviewProvider;

	constructor(
		private _webviewProvider: YapiWebviewProvider
	) {
		console.log('YapiProvider constructor');

	}

	get #openLinkMode() {
		return getConfig('boss.yapi.openLinkMode');
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

			this.#pathMap.set(range, match[0]);

			const link = new vscode.DocumentLink(
				range,
				undefined
			);
			links.push(link);
		}

		return links;
	}

	resolveDocumentLink(link: vscode.DocumentLink, token: vscode.CancellationToken): vscode.ProviderResult<vscode.DocumentLink | undefined> {
		// 在这里实现链接跳转逻辑
		// 只有在 link.target 为 undefined 时才会调用该方法
		// 注意：如果 resolveDocumentLink 方法不返回值，则不能支持链接点击跳转
		const path = this.#pathMap.get(link.range);

		if (!path) {
			return;
		}

		if (this.#openLinkMode === 'browser') {
			link.target = vscode.Uri.parse(`${YAPI_SEARCH_RUL}?url=${path}`);
			return link;
		}

		this._webviewProvider.openWebview(path);
	}
}

async function getInterfaceByPath(path: string) {
	const res = await searchApi(path);
	if (res.interface.length > 0) {
		const { _id } = res.interface[0];
		return await getInterfaceById(_id);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const webviewProvider = new YapiWebviewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			YapiWebviewProvider.viewType,
			webviewProvider
		)
	);

	const linkProvider = new YapiLinkProvider(webviewProvider);
	context.subscriptions.push(
		vscode.languages.registerDocumentLinkProvider(
			{ scheme: YapiLinkProvider.scheme },
			linkProvider
		)
	);
}