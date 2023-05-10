/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AxiosRequestConfig } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 是否加载中 */
    loading?: boolean;
    /** 是否使用 application/x-www-form-urlencoded 格式发送数据 */
    formUrlencodedHeaders?: boolean;
    /** 是否返回原始响应数据，而非经过解析后的响应属性 */
    shouldReturnRawResponse?: boolean;
  }
}
