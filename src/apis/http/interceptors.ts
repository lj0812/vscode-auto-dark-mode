import type {
    AxiosStatic,
    InternalAxiosRequestConfig,
    AxiosResponse,
    AxiosError,
} from 'axios';
import { CK_YAPI_UID, CK_YAPI_TOKEN } from '@/constants';
import { getConfig } from '@/helpers/config.vscode';

export const requestInterceptor = (config: InternalAxiosRequestConfig) => {
    config.baseURL = 'https://api.weizhipin.com';

    console.log('拦截器 请求', config);
    const yapiUid = getConfig(CK_YAPI_UID);
    const yapiToken = getConfig(CK_YAPI_TOKEN);

    if (yapiUid && yapiToken) {
        // config.headers['Cookie'] = `_yapi_uid=${yapiUid}; _yapi_token=${yapiToken}`;
    }
    return config;
};

export const requestInterceptorCatch = (error: AxiosError) => {
    console.log('拦截器 请求 失败', error);
    return Promise.reject(error);
};

export const responseInterceptor = (response: AxiosResponse) => {
    // 2xx 范围内的状态码都会触发该函数。
    console.log('拦截器 响应', response);
    return response;
};

export const responseInterceptorCatch = (error: AxiosError) => {
    // 超出 2xx 范围的状态码都会触发该函数。
    console.log('拦截器 响应 失败', error);
    return Promise.reject(error);
};

export const setInterceptor = (axios: AxiosStatic) => {
    axios.interceptors.request.use(
        requestInterceptor,
        requestInterceptorCatch
    );

    axios.interceptors.response.use(
        responseInterceptor,
        responseInterceptorCatch
    );
};
