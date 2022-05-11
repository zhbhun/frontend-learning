# [正则表达式](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

## 基础

### 创建

- 构造函：`new RegExp('abc')`
- 字面量：`/abc/`

标志

- g：全局搜索
- i：忽略大小写
- m：多行搜索
- s：允许 . 匹配换行
- u：使用 UNICode 码的模式进行匹配
- y：执行“粘性”搜索，匹配从目标字符串的当前位置开始

### 匹配

- `RegExp.prototype.exec`：一个在字符串中执行查找匹配的 RegExp 方法，它返回一个数组（未匹配到则返回 null）；
- `RegExp.prototype.test`：一个在字符串中测试是否匹配的 RegExp 方法，它返回 true 或 false；
- `String.prototype.match`：一个在字符串中执行查找匹配的 String 方法，它返回一个数组，在未匹配到时会返回 null；
- `String.prototype.matchAll`：一个在字符串中执行查找所有匹配的 String 方法，它返回一个迭代器（iterator）；
- `String.prototype.search`：一个在字符串中测试匹配的 String 方法，它返回匹配到的位置索引，或者在失败时返回 -1；
- `String.prototype.replace`：一个在字符串中执行查找匹配的 String 方法，并且使用替换字符串替换掉匹配到的子字符串；
- `String.prototype.split`：一个使用正则表达式或者一个固定字符串分隔一个字符串，并将分隔后的子字符串存储到数组中的 String 方法。

## 进阶

### 常用的正则匹配



## 参考

- [正则表达式](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_Expressions)
- [RegExp(正则表达式)](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- [理解Javascript的正则表达式](https://juejin.cn/post/6844904071388741639)
