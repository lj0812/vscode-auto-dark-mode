// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import autoDarkMode from './commands/auto-dark-mode';
import replaceColor from './commands/replace-color';
import generateStyleTree from './commands/generate-style-tree';
import customComment from './commands/custom-comment';
import generateApi from './commands/generate-api';
import YapiProvider, { yapiCommand, generateDTS } from './commands/search-api';
import { activate as yapiActivate } from './modules/yapi';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	/**
	 * 自动切换主题
	 */
	const autoDarkModeCommand = vscode.commands.registerCommand(
		'boss.auto-dark-mode',
		autoDarkMode
	);
	context.subscriptions.push(autoDarkModeCommand);

	/**
	 * 替换颜色
	 */
	const replaceColorCommand = vscode.commands.registerCommand(
		'boss.replace-color',
		replaceColor
	);
	context.subscriptions.push(replaceColorCommand);

	/**
	 * 生成样式树
	 */
	const generateStyleTreeCommand = vscode.commands.registerCommand(
		'boss.generate-style-tree',
		generateStyleTree
	);
	context.subscriptions.push(generateStyleTreeCommand);

	/**
	 * 自定义注释
	 */
	const customCommentCommand = vscode.commands.registerCommand(
		'boss.custom-comment',
		customComment
	);
	context.subscriptions.push(customCommentCommand);


	/**
	 * =============================
	 * yapi相关
	 * =============================
	 */
	// const yapiProvider = new YapiProvider();
	// const yapiLinkProvider = vscode.languages.registerDocumentLinkProvider(
	// 	{ scheme: YapiProvider.scheme },
	// 	yapiProvider
	// );

	/**
	 * 打开yapi
	 */
	const openYapiCommand = vscode.commands.registerCommand(
		yapiCommand.command,
		yapiCommand.callback(context)
	);
	/**
	 * 生成d.ts
	 */
	const generateDTSCommand = vscode.commands.registerCommand(
		'boss.generate-dts',
		generateDTS
	);

	/**
	 * 生成api
	 */
	const generateApiCommand = vscode.commands.registerCommand(
		'boss.generate-api',
		generateApi
	);

	context.subscriptions.push(
		// yapiProvider,
		// yapiLinkProvider,
		openYapiCommand,
		generateDTSCommand,
		generateApiCommand
	);

	yapiActivate(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
