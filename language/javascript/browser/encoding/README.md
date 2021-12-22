# 编码

## 字符编码

> 计算机内部，所有信息最终都是一个二进制值。每一个二进制位（bit）有0和1两种状态，因此八个二进制位就可以组合出256种状态，这被称为一个字节（byte）。也就是说，一个字节一共可以用来表示256种不同的状态，每一个状态对应一个符号，就是256个符号，从00000000到11111111。

- ASCII 码

    ASCII 码一共规定了 128 个字符的编码，比如空格 SPACE 是32（二进制 00100000），大写的字母 A 是 65（二进制 01000001）。这 128 个符号（包括 32 个不能打印出来的控制符号），只占用了一个字节的后面 7 位，最前面的一位统一规定为0。

    ps：上个世纪60年代，美国制定了一套字符编码，对英语字符与二进制位之间的关系，做了统一规定。

- 非 ASCII 编码

    英语用 128 个符号编码就够了，但是用来表示其他语言，128 个符号是不够的。例如中文常见的编码方式是 GB2312，使用两个字节表示一个汉字，所以理论上最多可以表示 256 x 256 = 65536 个符号。

- Unicode

    世界上存在着多种编码方式，同一个二进制数字可以被解释成不同的符号。因此，要想打开一个文本文件，就必须知道它的编码方式，否则用错误的编码方式解读，就会出现乱码。Unicode 就是为了解决这个问题而诞生的，它是一种所有符号的编码，现在的规模可以容纳100多万个符号。

    ps：具体的符号对应表，可以查询 [The Unicode Consortium](http://www.unicode.org/) 和[字体编辑用中日韩汉字Unicode编码表](http://www.chi2ko.com/tool/CJK.htm)。

    Unicode 只是一个符号集，规定了符号的二进制代码，却没有规定这个二进制代码应该如何存储。如果每个符号都使用三个或四个字节表示，那么每个英文字母前都必然有二到三个字节是0，这对于存储来说是极大的浪费，文本文件的大小会因此大出二三倍，这是无法接受的。为了解决这个问题，出现了 Unicode 的多种存储方式。

    - UTF-8：一种变长的编码方式。它可以使用1~4个字节表示一个符号，根据不同的符号而变化字节长度。

        对于单字节的符号，字节的第一位设为0，后面7位为这个符号的 Unicode 码。因此对于英语字母，UTF-8 编码和 ASCII 码是相同的。

        于n字节的符号（n > 1），第一个字节的前n位都设为1，第n + 1位设为0，后面字节的前两位一律设为10。剩下的没有提及的二进制位，全部为这个符号的 Unicode 码。

        下表总结了编码规则，字母x表示可用编码的位。

        ```
        Unicode符号范围     |        UTF-8编码方式
        (十六进制)        |              （二进制）
        ----------------------+---------------------------------------------
        0000 0000-0000 007F | 0xxxxxxx
        0000 0080-0000 07FF | 110xxxxx 10xxxxxx
        0000 0800-0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
        0001 0000-0010 FFFF | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        ```

    - UTF-16：字符用两个字节或四个字节表示
    - UTF-32：字符用四个字节表示

参考文献

- [字符编码笔记：ASCII，Unicode 和 UTF-8](http://www.ruanyifeng.com/blog/2007/10/ascii_unicode_and_utf-8.html)
- [程序员趣味读物：谈谈Unicode编码](https://www.pconline.com.cn/pcedu/empolder/gj/other/0505/616631.html)
- [The Absolute Minimum Every Software Developer Absolutely, Positively Must Know About Unicode and Character Sets (No Excuses!)](https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/)
- [UTF-8, a transformation format of ISO 10646](https://www.ietf.org/rfc/rfc3629.txt)

## URI 编码

### 什么是 URI 编码

URI 编码将 URI 非法字符转化成合法字符，转换后形式类似 `%**`。

- [Percent-encoding](https://en.wikipedia.org/wiki/Percent-encoding#Percent-encoding_in_a_URI)
- [百分号编码](https://zh.wikipedia.org/wiki/%E7%99%BE%E5%88%86%E5%8F%B7%E7%BC%96%E7%A0%81)

### 编码方法的区别

- escape / unescape

    - escape 是非标准方法
    - 在处理 0xff 以内字符时，编码方式是「%XX」（XX 为字符的 16 进制 unicode，同时也是字符的 UTF-8）
    - 在处理 0xff 之外字符的时候，是直接使用字符的 unicode 在前面加上一个 「%u」

        `%u` 后面是 4 位 16 进制，不支持基本多文种平面（BMP）外的字符（unicode 大于 0xffff）的字符。

- encodeURI / decodeURI：

    - encodeURI 是 W3C 标准方法
    - 在处理 0xff 以内字符时，编码方式是「%XX」（XX 为字符的 16 进制 unicode，同时也是字符的 UTF-8）
    - 在处理 0xff 之外字符的时候，先进行 UTF-8，再在 UTF-8 的每个字节码前加上一个 「%」

        基于 UTF-8 的，编码本身理论上可以支持 0x10ffff 内的字符（实际上现在的 JavaScript 不支持 BMP 外的字符，所以 encodeURI 也不支持 ）。

- encodeURIComponent / decodeURIComponent

    encodeURIComponent 也是 W3C 的标准方法，编码规则类似 encodeURI，区别在于需要转义的字符范围不一样。

参考文献

- [difference between escape, encodeuri, encodeURIComponent](https://stackoverflow.com/questions/14317861/difference-between-escape-encodeuri-encodeuricomponent)
- [escape,encodeURI,encodeURIComponent有什么区别?](https://www.zhihu.com/question/21861899/answer/43480575)
- [Comparing escape(), encodeURI(), and encodeURIComponent()](http://xkr.us/articles/javascript/encode-compare/)
- [JavaScript encodeURI() vs encodeURIComponent() and decodeuricomponent()](https://love2dev.com/blog/whats-the-difference-between-encodeuri-and-encodeuricomponent/)
- [encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [UTF-8 编码查询工具](http://www.mytju.com/classCode/tools/encode_gb2312.asp)

### URL 编码中的空格问题

- [空格URL编码的正确使用姿势](https://cloud.tencent.com/developer/article/1127853)
- [URL编码中的空格(编码以后变为+)](https://blog.bihe0832.com/url_space.html)
- [qs](https://github.com/ljharb/qs) 用法

    - 编码时默认遵循 RFC3986 规范，将空格编码为 %20
    - 解码时会兼容 RFC1738 规范，将符号 `+` 解码为空格

    参考

    - [Parsing error， the plus sign is replaced by a blank space. + place space ](https://github.com/ljharb/qs/issues/277)
    - [How to exclude a specific character from being encoded?](https://github.com/ljharb/qs/issues/221)

## Base64 编码

- [WindowOrWorkerGlobalScope.btoa()](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa)
- [Base64 encoding and decoding](https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding)
- [原来浏览器原生支持JS Base64编码解码](https://www.zhangxinxu.com/wordpress/2018/08/js-base64-atob-btoa-encode-decode/)
- [解决 Javascript 中 atob 方法解码中文字符乱码问题](https://blog.sqrtthree.com/articles/utf8-to-b64/)
- [Binary strings](https://developer.mozilla.org/en-US/docs/Web/API/DOMString/Binary)

## HTML 转义

- https://dev.w3.org/html5/html-author/charref
- [HTML Entities](https://www.w3schools.com/html/html_entities.asp)
- [HTML 转义字符](http://tool.oschina.net/commons?type=2)
- [HTML entity encoder/decoder](https://mothereff.in/html-entities)
- [node-html-entities](https://www.npmjs.com/package/html-entities)
- [mathiasbynens/he](https://github.com/mathiasbynens/he)
- [Character encodings in HTML](https://en.wikipedia.org/wiki/Character_encodings_in_HTML)

