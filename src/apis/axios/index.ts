import axios from 'axios';
import { stringify } from 'qs';
import { getConfig } from '../../helpers/config.vscode';
import * as vscode from 'vscode';

import {
    CONTENT_TYPE_JSON,
    CONTENT_TYPE_FORM,
    DEFAULT_TIMEOUT,
    EMPTY_RESPONSE_ERROR_MESSAGE
} from './constants';

import type {
    AxiosRequestConfig,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
    Method,
} from 'axios';


// 默认配置
// 超时时间：10s
axios.defaults.timeout = DEFAULT_TIMEOUT;
// post请求头默认为json
axios.defaults.headers.post['Content-Type'] = CONTENT_TYPE_JSON;

// 请求拦截器
axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // application/x-www-form-urlencoded 格式化请求参数
        if (config.formUrlencodedHeaders && config.method === 'post') {
            config.headers['Content-Type'] = CONTENT_TYPE_FORM;
            config.data = stringify(config.data);
        }

        // cookie 设置 _yapi_uid 和 _yapi_token
        const yapiUid = getConfig('boss.yapi.uid');
        const yapiToken = getConfig('boss.yapi.token');

        if (yapiUid && yapiToken) {
            config.headers['Cookie'] = `_yapi_uid=${yapiUid}; _yapi_token=${yapiToken}`;
        }

        return config;
    },
    (error: AxiosError) => {
        // 对请求错误做些什么
        return Promise.reject(error);
    }
);

// 响应拦截器
axios.interceptors.response.use(
    (response: AxiosResponse) => {
        // console.log('response raw', response);
        if (response.status !== 200) {
            return Promise.reject(response);
        }
        return response;
    },
    (error: AxiosError) => {
        // 对响应错误做点什么
        return Promise.reject(error);
    }
);



// 封装请求方法：request
export const request = (url: string, method: Method, config: AxiosRequestConfig) => {
    const payload = { url, method, ...config };

    return axios.request({ ...payload })
        .then(response => {
            const { data } = response;

            if (!data) {return Promise.reject({ message: EMPTY_RESPONSE_ERROR_MESSAGE });};

            const { config } = response;

            // 如果是下载文件，直接返回response
            if (config.responseType === 'blob') {
                return Promise.resolve(response);
            }

            const { errcode: code } = data;

            // 如果code不为0，直接reject
            if (code !== 0) {
                return Promise.reject(data);
            }

            const { data: zpData } = data;

            // 如果配置了shouldReturnRawResponse，直接返回data，否则返回zpData
            const payload = config.shouldReturnRawResponse ? data : zpData;

            return Promise.resolve(payload);
        })
        .catch(error => {
            console.log('error', error);
            if (error.errcode === 40011) {
                vscode.window.showErrorMessage('yapi token 已过期，请重新设置');
            }
            return Promise.reject(error);
        });
};

/**
 * get
 * @param {String} url 请求的URL地址
 * @param {Object} params query params
 * @param {Object} config 请求额外配置
 */
export const get = (url: string, params = {}, config = {}) => {
    config = { params, ...config };
    return request(url, 'get', config);
};

/**
 * post
 * @param {String} url 请求的URL地址，不带query，query以config中的params参数为准
 * @param {Object} data request body
 * @param {Object} config 请求额外配置
 */
export const post = (url: string, data = {}, config = {}) => {
    config = { data, ...config };
    return request(url, 'post', config);
};
