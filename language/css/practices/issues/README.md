# 如何居中元素？

**水平居中**

- 普通元素

    ```css
    div {
      display: block;
      margin: 10px auto;
      width: 100px;
      height: 100px;
    }
    ```

- 绝对定位元素

    方案1

    ```css
    div {
      position: absolute;
      left: 50%;
      margin: 0 0 0 -25px;
      width: 100px;
      height: 100px;
    }
    ```

    方案2：transform

- flex：略

**垂直居中**

- 绝对定位元素

    方案1

    ```css
    .wrapper {
      position: relative;
      height: 100px;
    }
    div {
      position: absolute;
      top: 50%;
      margin: -25px 0 0;
      width: 100px;
      height: 100px;
    }
    ```

    方案2

    ```css
    .wrapper {
      position: relative;
      height: 100px;
    }
    div {
      position: absolute;
      top: 50%;
      width: 100px;
      height: 100px;
      transform: translate(0, -50%);
    }
    ```
    
- flex

    ```css
    .wrapper {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    div {
      height: 50px;
    }

    ```

