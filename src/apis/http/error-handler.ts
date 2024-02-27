import * as vscode from 'vscode';

import type { AxiosRequestConfig } from 'axios';

export const errorHandler = (error: any, options: AxiosRequestConfig) => {
    console.log('错误处理', error, options);

    if (error.response) {
        console.log('请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围');
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
    } else if (error.request) {
        console.log('请求已经成功发起，但没有收到响应');
        // 请求已经成功发起，但没有收到响应
        // `error.request` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例
        console.log(error.request);
        vscode.window.showErrorMessage('请求已经成功发起，但没有收到响应');
    } else {
        // 发送请求时出了点问题
        console.log('发送请求时出了点问题');
        console.log('Error', error.message);
    }

    console.log('其他');
    console.log(error.config);
};
