# [WXML](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/)

## 基础

### 数据绑定

```xml
<!-- 内容 -->
<view> {{message}} </view>

<!-- 属性 -->
<view id="item-{{id}}"> </view>

<!-- 控制属性 -->
<view wx:if="{{condition}}"> </view>

<!-- 运算 -->
<view hidden="{{flag ? true : false}}"> Hidden </view>
<view> {{a + b}} + {{c}} + d </view>
<view wx:if="{{length > 5}}"> </view>
<view>{{"hello" + name}}</view>
<view>{{object.key}} {{array[0]}}</view>
```

### 列表渲染

```xml
<!-- 默认数组的当前项的下标变量名默认为 index，数组当前项的变量名默认为 item -->
<view wx:for="{{array}}"> {{index}}: {{item}} </view>

<!-- 使用 wx:for-item 可以指定数组当前元素的变量名，使用 wx:for-index 可以指定数组当前下标的变量名 -->
<view wx:for="{{array}}" wx:for-index="idx" wx:for-item="itemName">
  {{idx}}: {{itemName.message}}
</view>

<!-- 将 wx:for 用在<block/>标签上，以渲染一个包含多节点的结构块 -->
<block wx:for="{{[1, 2, 3]}}">
  <view> {{index}}: </view>
  <view> {{item}} </view>
</block>

<!-- wx:key -->
<switch wx:for="{{objectArray}}" wx:key="unique" style="display: block;"> {{item.id}} </switch>
<switch wx:for="{{numberArray}}" wx:key="*this" style="display: block;"> {{item}} </switch>
```

### 条件渲染

```xml
<!-- 基础用法  -->
<view wx:if="{{view == 'WEBVIEW'}}"> WEBVIEW </view>
<view wx:elif="{{view == 'APP'}}"> APP </view>
<view wx:else="{{view == 'MINA'}}"> MINA </view>

<!-- block 用法 -->
<block wx:if="{{true}}">
  <view> view1 </view>
  <view> view2 </view>
</block>
```

### 模板

```xml
<template name="staffName">
  <view>
    FirstName: {{firstName}}, LastName: {{lastName}}
  </view>
</template>

<template is="staffName" data="{{...staffA}}"></template>
<template is="staffName" data="{{...staffB}}"></template>
<template is="staffName" data="{{...staffC}}"></template>
```

## 引用

- import

    ```xml
    <!-- item.wxml -->
    <template name="item">
    <text>{{text}}</text>
    </template>
    <import src="item.wxml"/>
    <template is="item" data="{{text: 'forbar'}}"/>
    ```

- include

    ```xml
    <!-- index.wxml -->
    <include src="header.wxml"/>
    <view> body </view>
    <include src="footer.wxml"/>
    <!-- header.wxml -->
    <view> header </view>
    <!-- footer.wxml -->
    <view> footer </view>
    ```
    
    

