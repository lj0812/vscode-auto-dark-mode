/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

import { isArrayBuffer, isBlob } from '@/utils';

import { setDefaultConfig } from './config';
import { errorHandler } from './error-handler';
import { setInterceptor } from './interceptors';
import RequestCache from './request-cache';

import type { ResponseData } from './types';
import type { AxiosRequestConfig } from 'axios';


// 默认配置
setDefaultConfig(axios);

// 拦截器
setInterceptor(axios);

const request = <
    Result,
    RequestData = any
>(
    options: AxiosRequestConfig<RequestData>
) => {
    const promise = axios.request<ResponseData<Result>>(options)
        .then((response) => {
            console.log('response', response);
            const resData = response.data;

            // 'arraybuffer', 'document', 'json', 'text', 'stream', 'blob'

            if (
                typeof resData === 'string'
                || isBlob(resData)
                || isArrayBuffer(resData)
            ) {
                return resData;
            }

            if (resData.errcode !== 0) {
                return Promise.reject(resData);
            }

            return resData.data;
        })
        .catch((error) => {
            console.log('response error', error);
            errorHandler(error, options);
        })
        .finally(() => {

        });

    return promise;
};

export const get = <T>(
    url: string,
    options?: AxiosRequestConfig
) => {
    const params = options?.params;
    /** 根据 URL 和 params 生成 key，用于缓存 */
    const key = RequestCache.getCacheKey(url, params);

    if (RequestCache.has(key)) {
        return RequestCache.get(key);
    }

    const payload = {
        method: 'get',
        url,
        params,
        ...options,
    };

    const promise = request<T>(payload);

    RequestCache.add(key, promise);

    return promise.finally(() => {
        RequestCache.remove(key);
    });
};

export const post = <T>(
    url: string,
    data?: any,
    options?: AxiosRequestConfig
) => {
    const payload = {
        method: 'post',
        url,
        data,
        ...options,
    };

    return request<T>(payload);
};
