# 内存测试

## 数组分配

```js
list = []
for (let index = 0; index < 1e6; index++) {
  list.push(new NumberOperand(index));
}
```

![allocate-one-million-array.png](./allocate-one-million-array.png)

总结：每个 NumberOperand 对象实例占用 16 Byte 内存，100 万个占用 16_000_000 字节，差不多占用 15 字节。此外，数组本身需要占用内存，100 万长度的数组占用 50 万个字节。

## 数组拷贝


```js
his = [];
his.push(list.slice(0)); // list 是上文 100 万长度的 NumberOperand 数组
```

![copy-one-million-array.png](./copy-one-million-array.png)

总结：数组拷贝时没有重新生成 NumberOperand 实例，只是拷贝后的新数组需要占用内存，新的数组长度也是 100 万，大约占用 50 万个字节。
