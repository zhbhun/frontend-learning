图片
========

## 线性渐变

- 简介

    > CSS linear-gradient() 函数用于创建一个表示两种或多种颜色线性渐变的图片，其结果属于 gradient 数据类型，是一种特别的 image 数据类型。

- 原理

    N/A

- 语法

    ```
    linear-gradient( 
    [ <angle> | to <side-or-corner> ,]? <color-stop> [, <color-stop>]+ )
    \---------------------------------/ \----------------------------/
        Definition of the gradient line        List of color stops  

    where <side-or-corner> = [left | right] || [top | bottom]
    and <color-stop>     = <color> [ <percentage> | <length> ]?
    ```

- 要点

    - 线性渐变是一种特殊的图片类型，只能适用于使用图片的场景，不能用于颜色；
    - 线性渐变没有固定的大小，而是自适应元素的大小，需要实现重复的渐变效果可以使用 repeating-linear-gradient()；
    - 线性渐变默认方向是从上到下（`to bottom`），角度 0 是从下到上开始按顺时针方向处理；
    - 线性渐变存在两种语法，一种是使用浏览器厂商前缀，一种是没有前缀的；

- 应用

    - [Using CSS gradients](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Images/Using_CSS_gradients)

- 参考

    - [linear-gradient()](https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient)
    - [repeating-linear-gradient()](https://developer.mozilla.org/en-US/docs/Web/CSS/repeating-linear-gradient)

## 径向渐变

- 简介

    > CSS radial-gradient() 函数创建一个 image，用来展示由原点（渐变中心）辐射开的颜色渐变。这个方法得到的是一个 CSS gradient 数据类型的对象。

- 原理

    N/A

- 语法

    ```
    radial-gradient(
    [ [ circle || <length> ]                         [ at <position> ]? , |
        [ ellipse || [ <length> | <percentage> ]{2} ]  [ at <position> ]? , |
        [ [ circle | ellipse ] || <extent-keyword> ]   [ at <position> ]? , |
        at <position> ,
    ]?
    <color-stop> [ , <color-stop> ]+
    )
    where <extent-keyword> = closest-corner | closest-side | farthest-corner | farthest-side
    and <color-stop>     = <color> [ <percentage> | <length> ]? 
    ```

- 要点

    - 径向渐变是一种特殊的图片类型，只能适用于使用图片的场景，不能用于颜色；
    - 径向渐变没有固定的大小，而是自适应元素的大小，需要实现重复的渐变效果可以使用 repeating-radial-gradient()；

- 应用

    - [内凹圆角](https://segmentfault.com/a/1190000005153660)

- 参考

    - [radial-gradient()](https://developer.mozilla.org/en-US/docs/Web/CSS/radial-gradient)
