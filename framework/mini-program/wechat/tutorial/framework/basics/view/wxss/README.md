# 样式

## 基础 

### WXSS VS CSS

- rpx
- 样式导入
- 作用域范围

    - 全局：app.wxss 中的样式为全局样式
    - 页面/组件：在 page 或 component 的 wxss 文件中定义的样式为局部样式，只作用在对应的页面或组件，并会覆盖 app.wxss 中相同的选择器。

### 组件样式

#### 样式隔离

- isolated

    - 组件内只能使用类选择器，且具有隔离效果（app.wxss 和页面类选择器样式对自定义组件无效）
    - ID 选择器无法作用于组件内元素，组件内的 ID 选择器样式会影响页面样式；
    - 标签选择器会作用于所有组件和页面
    - 组件和引用组件的页面使用子选择器或后代选择器，可能导致非预期的情况
    - 可使用 :host 选择器指定默认样式
    - 组件内可继承页面和父组件的可继承样式

- apply-shared
- shared
- page-isolated
- page-apply-shared
- page-shared

#### 外部样式类

TODO

#### 引用页面或父组件样式

略

## 存在问题

- 级联选择器支持不完善

    - [wxss样式表支持级联选择吗？](https://developers.weixin.qq.com/community/develop/doc/be53a24de3902377c05db8ab9c742dd0)


## 参考文献

- [WXSS 指南](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html)
- [组件模板和样式](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/wxml-wxss.html#%E7%BB%84%E4%BB%B6%E6%A0%B7%E5%BC%8F)
