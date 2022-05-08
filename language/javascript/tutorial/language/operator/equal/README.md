- [【译】 == vs === vs Object.is()](https://juejin.cn/post/6844903917176750088)

- NaN

    - `Object.is(NaN, NaN)`：true
    - `NaN === NaN`：false

- 0 与 -0

    - `Object.is(0, -0)`：false
    - `0 ==== -0`：true

---
