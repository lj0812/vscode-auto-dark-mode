# Friday

> 在Friday的帮助下，让你的工作充满星期五的快乐！

## 功能一：暗黑相关功能

### 0. 配置参数

配置颜色变量地址，建议在项目根目录下 .vscode 目录下的 settings.json 配置此参数

    ``` json
      // .vscode/settings.json

      {
        "boss.css.variables": "path/to/your/variables/files",
      }
    ```

### 1. 替换旧版色值

在 vue 文件下使用命令或点击工具栏按钮替换旧版色值

1. 点击工具栏 ![icon-paint.png](https://img.bosszhipin.com/static/file/2022/hoj7lgvsyq1662101737648.png)
2. 命令方式 cmd + shift + p，然后搜索 Replace Color 执行

### 2. 生成暗黑样式

在 vue 文件下使用命令或点击工具栏按钮生成样式

1. 点击工具栏 ![icon-moon.png](https://img.bosszhipin.com/static/file/2022/hqa0pjvq141661917538860.png)
2. 命令方式 cmd + shift + p，然后搜索 Auto Dark Mode 执行

### 3. 根据HTML结构生成style

在 vue 文件下使用命令或点击工具栏按钮根据HTML结构生成style

1. 点击工具栏 ![icon-magic.png](https://img.bosszhipin.com/static/file/2022/ctpn9qy8p01663578433077.png)
2. 命令方式 cmd + shift + p，然后搜索 Generate Style Tree 执行

### 其他情况

#### 1. 不需要转换某些样式，如何处理？

在不需要转换样式的 类名 或 属性 上方添加注释 `// disable auto-dark-mode`

1. 只禁用某一行，此时 background 将不会转换颜色

    ``` less
      .btn {
        // disable auto-dark-mode
        background: @l-boss-500;
        color: @l-white;
      }
    ```

2. 禁用一个类名，此时 .btn 下的全部颜色将不会转换

    ``` less
      // disable auto-dark-mode
      .btn {
        background: @l-boss-500;
        color: @l-white;
      }
    ```

#### 2. 我想覆盖自动生成的样式，如何处理？

在生成的暗黑样式下方添加额外的 @media (prefers-color-scheme: dark) 覆盖，或者其他提升优先级的方式

> 特别注意：不要在自动生成的代码块内覆盖样式，否则下次生成样式时，自定义样式将丢失

> 特别注意：不要在自动生成的代码块内覆盖样式，否则下次生成样式时，自定义样式将丢失

> 特别注意：不要在自动生成的代码块内覆盖样式，否则下次生成样式时，自定义样式将丢失

``` less
/* auto injected by auto-dark-mode start */
@media (prefers-color-scheme: dark) and (max-device-width: 1024px) {
    .btn {
      background: @d-boss-500;
      color: @d-white;
    }
}
/* auto injected by auto-dark-mode end */

@media (prefers-color-scheme: dark) and (max-device-width: 1024px) {
  // 需要覆盖的样式写在这里
  .btn {
    background: @d-blue-500;
    color: @d-white;
  }
}
```

#### 3. 我想保留生成的暗黑代码里的所有颜色

默认配置下，生成的暗黑代码只保留了能够匹配出色值的颜色
比如下面只会保留 background 的色值

``` less
.btn{
  color: #135246; // 无应的色值
  background: #F5F5F6; // 对应 @l-grey-100
}
/* auto injected by auto-dark-mode start */
@media (prefers-color-scheme: dark) and (max-device-width: 1024px) {
  .btn{
    background: @d-grey-100;
  }
}
/* auto injected by auto-dark-mode end */
```

如果想保留所有色值需配置 `boss.css.saveUnconvertedColor: true`，配置后将保留原色值

``` less
.btn{
  color: #135246; // 无应的色值
  background: #F5F5F6; // 对应 @l-grey-100
}
/* auto injected by auto-dark-mode start */
@media (prefers-color-scheme: dark) and (max-device-width: 1024px) {
  .btn{
    color: #135246; // 保留原色值
    background: @d-grey-100;
  }
}
/* auto injected by auto-dark-mode end */
```

## 功能二：自定义注释，针对Typescript生成 /**  */ 注释

`com` + `.` 快捷键：生成/取消行注释

## 功能三：接口地址跳转Yapi详情页

接口地址匹配规则：

``` js
/(?<=(['`"]))(\/[a-zA-Z0-9\-]+){2,}(?:.json)?(?=\1)/g

# 将匹配以下

"/wapi/path/to/function"
"/wapi/path/to/function.json"
'/wapi/path/to/function.json'
```

匹配到接口路径后可以点击跳转至Yapi接口详情页

![src/assets/images/yapi-link.png](https://github.com/lj0812/vscode-auto-dark-mode/blob/main/src/assets/images/yapi-link.png)
