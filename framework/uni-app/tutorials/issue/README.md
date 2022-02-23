# 问题

## `components` 局部注册 uni-ui 组件无法重命名

- 代码

    ```js
    import { UniSection, UniList, UniListItem } from "@dcloudio/uni-ui";
    export default defineComponent({
      components: {
        UniList,
        UniListItem,
        UniSection1: UniSection,
      },
    }
    ```

- 日志

    ```shell
    Syntax Error: Error: Can't resolve '@dcloudio/uni-ui/lib/uni-section1/uni-section1' in '/Volumes/Work/project/practice/uniapp-vue3-tester/src/pages/index'
    ```

ps：自定义组件不存在该问题，可能和 uni-app 的编译配置有关。


## vue ref 只能作用于自定义组件

非自定义组件（如：view、text）需要通过 creatSelectQuery 查询获取。

## vue 模板局限性

- 不支持[指令动态参数](https://v3.cn.vuejs.org/guide/template-syntax.html#%E5%8A%A8%E6%80%81%E5%8F%82%E6%95%B0)

## vue2 存在问题

### 集成 TypeScript 提示 `Cannot read property 'extend' of undefined`

https://github.com/dcloudio/uni-app/issues/2186

### typescript 的 App.vue 必须使用 Vue.extend 来创建

typescript模板在入口文件中，使用 defineComponent 定义将会发生错误，原因为 uniapp 在挂载实例添加数据时读取路径不正确，所以入口文件应该使用 Vue.extend 定义文件。

参考 https://github.com/TuiMao233/uni-composition-api#appvue-%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9

### 支持 composition-api

- [vuejs/composition-api](https://github.com/vuejs/composition-api)
- [uni-composition-api](https://github.com/TuiMao233/uni-composition-api)

## Vue3 存在问题

### 当 prop 含有复杂表达式时, 无法正确渲染

https://github.com/dcloudio/uni-app/issues/2917

### vue3 的 style 属性值为组件状态时不生效（数组也不行）

- 代码

    ```vue
    <template>
      <text :style="[style1, style2]">123</text>
    </template>
    <script>
    export default {
	  data() {
		return {
          style1: { color: "red" },
          style2: { fontSize: "64rpx" },
		};
	  },
	}
    </script>
    ```

- 结果：text 组件的样式为 $root.xxx，这个 $root 不存在。

### vue3 的 style 属性值为组件状态的对象类型智时不生效

style 属性的值不支持组件的对象状态，必须改为数组才能生效。

ps：和上面是同一个问题。

### vue3 composition api 的 onPageScoll 不生效

必须已 option api 的形式定义一个空方法，onPageScroll 才有效。

参考 https://github.com/dcloudio/uni-app/issues/2914

### Vue3 缺少了EffectScope相关API

https://github.com/dcloudio/uni-app/issues/2915

### vue3版本下不支持v-model:[prop] 

https://github.com/dcloudio/uni-app/issues/2884

### vue3版本下在页面代码中 作用域插槽内的节点无法绑定事件

https://github.com/dcloudio/uni-app/issues/2886
