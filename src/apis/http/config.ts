import type { AxiosStatic } from 'axios';

export const CONTENT_TYPE_JSON = 'application/json;charset=UTF-8';
export const CONTENT_TYPE_FORM = 'application/x-www-form-urlencoded;charset=UTF-8';
export const CONTENT_TYPE_MULTIPART = 'multipart/form-data';

// 默认超时时间：30s
export const DEFAULT_TIMEOUT = 30000;

/** 默认错误信息 */
export const ErrorMessage = {
    /** 超出 200 时的错误 */
    STATUS_ERROR: '请求失败',
    /** 请求超时 */
    TIMEOUT: '请求超时',
    /** 网络错误 */
    NETWORK_ERROR: '网络错误',
    /** 未知错误 */
    UNKNOWN_ERROR: '未知错误',
    /** 请求已经成功发起，但没有收到响应 */
    NO_RESPONSE: '请求已经成功发起，但没有收到响应',
};

export const setDefaultConfig = (axios: AxiosStatic) => {
    // 默认配置
    // 超时时间
    axios.defaults.timeout = DEFAULT_TIMEOUT;

    // x-requested-with
    axios.defaults.headers['X-Requested-With'] = 'XMLHttpRequest';

    // post请求头默认为json
    axios.defaults.headers.post['Content-Type'] = CONTENT_TYPE_JSON;
};
