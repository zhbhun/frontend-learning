# 执行顺序
- 点击

    - 默认

        - touchstart
        - touchend
        - mouseover
        - mouseenter
        - mousemove
        - mousedown
        - mouseup
        - click

    - `touchstart-preventDefault`

        - touchstart
        - touchend

    - `touchmove-preventDefault`

        同默认

    - `touchend-prevenDefault`

        - touchstart
        - touchend

- 移动

    - 默认

        - touchstart
        - touchmove...
        - touchend

    - `touchstart-preventDefault`：同默认
    - `touchmove-preventDefault`：同默认
    - `touchend-prevenDefault`：同默认

- 长按

    - touchstart
    - touchend

- 冒泡

    - 点击

        - 默认

            - inner: touchstart
            - outer: touchstart
            - inner: touchend
            - outer: touchend
            - inner: mouseover
            - outer: mouseover
            - outer: mouseenter
            - inner: mouseenter
            - inner: mousemove
            - outer: mousemove
            - inner: mousedown
            - outer: mousedown
            - inner: mouseup
            - outer: mouseup
            - inner: click
            - outer: click
            - inner: mouseout
            - outer: mouseout
            - inner: mouseleave
            - outer: mouseleave

        - `touchstart-preventDefault` / `touchend-preventDefault`

            - inner: touchstart
            - outer: touchstart
            - inner: touchend
            - outer: touchend

        - `touchstart-preventDefault-stopPropagation`

            - inner: touchstart
            - inner: touchend
            - outer: touchend

        - `touchend-prevenDefault-stopPropagation`


            - inner: touchstart
            - outer: touchstart
            - inner: touchend

    - 拖动

        - 默认

            - inner: touchstart
            - outer: touchstart
            - inner: touchend
            - outer: touchend
            - inner: mouseover
            - outer: mouseover
            - outer: mouseenter
            - inner: mouseenter
            - inner: mousemove
            - outer: mousemove
            - inner: mousedown
            - outer: mousedown
            - inner: mouseup
            - outer: mouseup
            - inner: click
            - outer: click
            - inner: mouseout
            - outer: mouseout
            - inner: mouseleave
            - outer: mouseleave

        - `touchstart-preventDefault` / `touchend-preventDefault`

            - inner: touchstart
            - outer: touchstart
            - inner: touchmove
            - outer: touchmove
            - inner: touchend
            - outer: touchend

        - `touchstart-preventDefault-stopPropagation`

            - inner: touchstart
            - inner: touchmove
            - outer: touchmove
            - inner: touchend
            - outer: touchend

        - `touchmove-preventDefault-stopPropagation`

            - inner: touchstart
            - outer: touchstart
            - inner: touchmove
            - inner: touchmove
            - inner: touchend
            - outer: touchend

## 进阶

### 双指缩放

- [移动端双指缩放图片JS事件的实践心得](https://www.zhangxinxu.com/wordpress/2020/06/mobile-event-touches-zoom-sacle/)
