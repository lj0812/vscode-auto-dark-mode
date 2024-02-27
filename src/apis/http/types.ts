
export interface ApiResponse<T> {
    /** code */
    errcode: number,
    /** 信息 */
    errmsg: string,
    /** 响应数据 */
    data: T,
}

/**
* 如果返回结果期望是 Blob 或 ArrayBuffer，则保持原样
* 否则用返回体包装类型
**/
export type ResponseData<T> = T extends Blob
    ? Blob
    : T extends ArrayBuffer
    ? ArrayBuffer
    : ApiResponse<T>;
