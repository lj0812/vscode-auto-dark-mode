// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import autoDarkMode from './commands/auto-dark-mode';
import replaceColor from './commands/replace-color';
import generateStyleTree from './commands/generate-style-tree';
import customComment from './commands/custom-comment';
import YapiProvider, { yapiCommand } from './commands/search-api';
import * as api from './apis/index';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "bs-auto-dark-mode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('boss.auto-dark-mode', () => {
		// The code you place here will be executed every time your command is executed
		autoDarkMode();
	});

	const disposable2 = vscode.commands.registerCommand('boss.replace-color', () => {
		replaceColor();
	});

	const disposable3 = vscode.commands.registerCommand('boss.generate-style-tree', () => {
		generateStyleTree();
	});

	// 自定义注释功能
	const disposable4 = vscode.commands.registerCommand('boss.custom-comment', () => {
		customComment();
	});

	// yapi相关
	const yapiProvider = new YapiProvider();

	const yapiProviderRegistration = vscode.languages.registerDocumentLinkProvider(
		{ scheme: YapiProvider.scheme },
		yapiProvider
	);

	const yapiCommandRegistration = vscode.commands.registerCommand(yapiCommand.command, yapiCommand.callback(context));

	function testProvider() {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const provider = new YapiProvider();
			const links = provider.provideDocumentLinks(editor.document);
			console.log(links);
		}
	}

	function testInput() {
		// 获取当前激活的编辑器
    let editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showInformationMessage('No editor is active.');
      return;
    }

    // 获取当前编辑器的文档
    let document = editor.document;

    // 获取用户输入的字符串
    vscode.window.showInputBox({ prompt: 'Enter string to find' }).then((str) => {
      if (str) {
        let regex = new RegExp(str, 'g');
        let match;
        let results = [];

        // 在文档中查找指定的字符串
        while ((match = regex.exec(document.getText()))) {
          let startPos = document.positionAt(match.index);
          let endPos = document.positionAt(match.index + match[0].length);
          let range = new vscode.Range(startPos, endPos);

          results.push({ range });
        }

        // 如果找到匹配项，则在编辑器中显示它们
        if (results.length > 0) {
          editor.selections = [new vscode.Selection(results[0].range.start, results[0].range.end)];
          editor.revealRange(results[0].range, vscode.TextEditorRevealType.InCenter);

          // for (let i = 1; i < results.length; i++) {
          //   editor.selections.push(new vscode.Selection(results[i].range.start, results[i].range.end));
          //   editor.revealRange(results[i].range, vscode.TextEditorRevealType.InCenter);
          // }
        } else {
          vscode.window.showInformationMessage(`No matches found for "${str}"`);
        }
      }
		});
	}

	let disposable5 = vscode.commands.registerCommand('boss.findString', () => {
		// testProvider();
		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor) {
			const docUri = activeEditor.document.uri;
			console.log(docUri.scheme);
		}
	});

	context.subscriptions.push(
		disposable, disposable2, disposable3, disposable4, disposable5,
		yapiProvider,
		yapiProviderRegistration,
		yapiCommandRegistration
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
