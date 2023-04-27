// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import autoDarkMode from './commands/auto-dark-mode';
import replaceColor from './commands/replace-color';
import generateStyleTree from './commands/generate-style-tree';
import customComment from './commands/custom-comment';

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

	context.subscriptions.push(disposable, disposable2, disposable3, disposable4);
}

// this method is called when your extension is deactivated
export function deactivate() {}
