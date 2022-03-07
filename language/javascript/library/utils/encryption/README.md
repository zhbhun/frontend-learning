# 加密

## 工具库

- [crypto-js](https://github.com/brix/crypto-js)
- [openpgpjs](https://github.com/openpgpjs/openpgpjs) - OpenPGP implementation for JavaScript

## 在线工具

- [加密解密工具](http://tool.chacuo.net/cryptaes)

## 加密算法

### AES

- 模式：ECB、CBC、CTR、OFB、CFB
- 填充：zeropadding、pkcs5padding、pkcs7padding、iso10126、ansix923
- 密码：xxxxxxxxxxxxxxxx
- 偏移量：xxxxxxxxxxxxxxxx
- 输出：base64、hex
- 字符集：iso-8859-1、utf、gbk、gb2312、gb18030

```js
function config() {
  const key = CryptoJS.enc.Latin1.parse('1234567890123456');
  const iv = CryptoJS.enc.Latin1.parse('1234567890123456');
  return {
    key, // 密码
    iv, // 偏移量
    mode: CryptoJS.mode.CBC,// 模式
    padding: CryptoJS.pad.ZeroPadding, // 填充
  };
}

function encrypt(str) {
  const { key, iv, mode, padding } = config();
  const encrypted = CryptoJS.AES.encrypt(str, key, {
    iv,
    mode,
    padding,
  });
  // encrypted.ciphertext.toString() // hex
  return encrypted.toString();
}

function decrypt(str) {
  const { key, iv, mode, padding } = config();
  const decrypted = CryptoJS.AES.decrypt(str, key, {
    iv,
    mode,
    padding,
  });
  const decryptedStr = decrypted.toString(CryptoJS.enc.Latin1);
  return decryptedStr.toString();
}
```

## 参考文献

- [前端 crypto-js aes 加解密](https://www.jianshu.com/p/a47477e8126a)
