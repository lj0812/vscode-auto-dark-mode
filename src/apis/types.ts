// 声明Api
// 用于声明接口的类型
// key: string
// value: (params: any) => Promise<any>
export interface Api {
  [key: string]: (params: any) => Promise<any>;
}