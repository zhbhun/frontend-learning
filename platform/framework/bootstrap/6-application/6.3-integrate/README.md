# 常见问题
## box-sizing
某些第三方软件，包括 Google 地图和 Google 定制搜索引擎都会由于 `* { box-sizing: border-box; }` 的设置而产生冲突，这一设置使 `padding` 不影响页面元素最终宽度的计算。

根据不同情况，你可能需要根据情况覆盖（第1种选择）或为所有区域设置（第2种选择）。

```css
/* Box-sizing resets
 *
 * 为了避免 Bootstrap 设置的全局盒模型所带来的影响，可以重置单个页面元素或覆盖整个区域的盒模型。
 * 你有两种选择：覆盖单个页面元素或重置整个区域。它们都可以通过纯 CSS 或 LESS 代码的形式实现。
 */

/* Option 1A: 通过 CSS 代码覆盖单个页面元素的盒模型 */
.element {
  -webkit-box-sizing: content-box;
     -moz-box-sizing: content-box;
          box-sizing: content-box;
}

/* Option 1B: 通过使用 Bootstrap 提供的 LESS mixin 覆盖单个页面元素的盒模型 */
.element {
  .box-sizing(content-box);
}

/* Option 2A: 通过 CSS 代码重置整个区域 */
.reset-box-sizing,
.reset-box-sizing *,
.reset-box-sizing *:before,
.reset-box-sizing *:after {
  -webkit-box-sizing: content-box;
     -moz-box-sizing: content-box;
          box-sizing: content-box;
}

/* Option 2B: 通过使用自定义的 LESS mixin 重置整个区域 */
.reset-box-sizing {
  &,
  *,
  *:before,
  *:after {
    .box-sizing(content-box);
  }
}
.element {
  .reset-box-sizing();
}
```


# 参考文献
- [对第三方组件的支持](http://v3.bootcss.com/getting-started/#third-parties)
