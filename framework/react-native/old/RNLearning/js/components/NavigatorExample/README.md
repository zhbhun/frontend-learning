# 内容
- `initialRoute` | `initialRouteStack` | `renderScene`


    `renderScene` 调用时带参数

    - route：当前路由
    - navigator：Navigator 实例

    组合应用

    - `initialRoute` + `renderScene`：渲染初始化路由页面
    - `initialRouteStack` + `renderScene`：渲染初始化路由栈最后一个路由页面
    - `initialRoute` + `initialRouteStack`：渲染初始化路由栈中的某个路由页面

- `navigationBar`

    ```
    <Navigator.NavigationBar
      routeMapper={{ LeftButton: Function, RightButton: Function, Title: Function }}
      style={styles.navBar}
    />
    ```

    备注：LeftButton，RightButton 和 Title 调用时带有参数
    
    - route：当前路由
    - navigator：Navigator 实例
    - index：当前路由在路由栈的下标
    - navState：Navigator 状态

# 样式
- `style`：设置导航视图容器样式，可以修改边距，背景颜色等；
- `sceneStyle`：设置 `renderScene` 内容所在视图容器的样式，可以设置布局，背景颜色等，默认是个透明背景，区域等于外部或设备大小的视图；

## navigationBar
- `style`：导航条高度已经自动设置，但可以设置导航条的背景色
- title

    ```
    <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize, fontWeight...}}>title</Text>
    </View>
    ```

- 左侧按钮

    ```
    <TouchableOpacity
    style={{ flex: 1, justifyContent: 'center' }}
    >
    <Image
        style={{ margin: 12, width: 24, height: 24 }}
    />
    </TouchableOpacity>
    ```

- 右侧按钮

    ```
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
    <TouchableOpacity>
        <Image
        style={{ margin: 12, width: 24, height: 24 }}
        />
    </TouchableOpacity>
    ...
    </View>
    ```

# 动画
- `configureScene`：一个返回动画参数的函数，用于配置场景动画和手势

    - Navigator.SceneConfigs.PushFromRight：默认值，从右侧覆盖出现；
    - Navigator.SceneConfigs.FloatFromRight：从右侧浮动出现，可以在新场景从左侧边缘往右滑来返回上一场景；
    - Navigator.SceneConfigs.FloatFromLeft：与 FloatFromRight 相反
    - Navigator.SceneConfigs.FloatFromBottom：与 FloatFromRight 类似，但从底侧出现
    - Navigator.SceneConfigs.FloatFromBottomAndroid：与 FloatFromBottom 相比，没有纵深效果，且不能从顶侧往下滑来返回上一场景
    - Navigator.SceneConfigs.HorizontalSwipeJump：？
    - Navigator.SceneConfigs.HorizontalSwipeJumpFromRight：？
    - Navigator.SceneConfigs.HorizontalSwipeJumpFromLeft：？
    - Navigator.SceneConfigs.SwipeFromLeft：从左侧滑动进入，可以拖动返回上一场景
    - Navigator.SceneConfigs.VerticalUpSwipeJump：从底侧滑动进入，不可以拖动返回
    - Navigator.SceneConfigs.VerticalDownSwipeJump：从顶侧滑动进入，不可以拖动返回
    - Navigator.SceneConfigs.FadeAndroid：淡入淡出

    疑问：push，float，fade，swipe 的区别？
    
    - push 是上层覆盖出现，前后场景不在同一平面上；
    - float 是上层浮动出现，前后场景也不在同一平面上，而且前后场景平面的纵深越来越远；
    - swipe 是滑动出现，前后场景在同意平面上；

    实际应用：
    
    - `configureScene` 调用时会传递两个参数：`route` 和 `routeStack`，通常在 route 里设置属性 sceneConfig，这样可以针对不同的 route 设置不同的场景切换动画；
    - 有些动画是可以通过手势返回上一场景的，需要注意使用场景；

# 事件
- `onDidFocus`

    - 功能：每当导航切换完成或初始化之后，调用此函数
    - 参数：event

        ```
        {
          type: 'didFocus',
          data: {
            route: Route, // 要转向的路由
          },
        }
        ```

- `onWillFocus`

    - 功能：会在导航切换之前调用此函数
    - 参数：event

        ```
        {
          type: 'willFocus',
          data: {
            route: Route, // 要转向的路由
          },
        }
        ```

# API
- 路由接口

    - `immediatelyResetRouteStack(RouteStack)`：用新的路由栈来重置路由栈
    
        - 新的路由栈显示最后一个路由场景
        - 重置的时候没有过渡动画，立即刷新显示

    - `jumpBack()`：跳转至路由栈中当前显示路由所在的上一个路由（不存在上一个路由的话抛出错误异常），并且不会卸载当前显示路由；
    - `jumpForward()`：跳转至路由栈中当前显示路由所在的下一个路由（不存在的话抛出错误异常）
    - `jumpTo(route)`：跳转到已有的路由（必须是当前路由栈中以挂载的路由，否则抛出错误异常），并且不会卸载该路由之后的其他路由；
    - `pop()`：卸载当前路由并跳转至上一个路由，如果没有上一个路由的话，不做任何处理；
    - `popN(number)`：往回跳转多少个路由，如果没有对应路由的话，不做任何处理（不会跳转）；
    - `popToRoute(route)`：跳转到已有的路由（必须是当前路由栈中以挂载的路由，否则抛出错误异常），与 `jumpTo` 不同的是该方法会卸载目标路由之后的所有路由；
    - `popToTop()`：返回到路由栈中的第一个路由，并卸载所有其他路由；
    - `push(Route)`：跳转至新的路由，往路由栈里添加新的路由；
    - `replace(Route)`：用一个新的路由替换掉当前显示路由；
    - `replaceAtIndex(Route, index, cb)`：替换指定下标的路由，替换成功后执行回调函数 cb；

        - 如果 index 下标对应的路由不存在，则不做任何处理
        - 如果 index 是负值的话，则替换当前显示路由

    - `replacePrevious(Route)`：替换掉当前显示路由的上一个路由，如果没有上一个路由，则替换当前显示路由；
    - `replacePreviousAndPop(Route)`：替换掉当前显示路由的上一个路由，并进行 `pop()` 操作，如果没有上一个路由，则不做任何处理
    - `resetTo(Route)`：重置路由栈，并跳转至新的路由，与 `immediatelyResetRouteStack` 不同的是 resetTo 只能指定一个路由，但 resetTo 跳转时是有返回动画显示的；
    - `getCurrentRoutes()`：返回当前路由栈

    要点：

    1. 区分 jump 和 pop / push，前者是不会卸载或增加路由，后者会卸载或增加路由；
    2. 区分 immediatelyResetRouteStack，replace 和 resetTo；
    3. 有些路由切换时可能会抛出异常，不要忘记处理（大部分是 jump 相关接口）；

- Navigator 状态数据结构，可以用过 navigator.state 访问

    ```
    {
      sceneConfigStack: [{...}], // 场景动画配置栈
      routeStatck: [{...}]， 路由栈
      presentedIndex: number, // 当前显示路由
      ...
    }
    ```

# 源码
## Navigator

- Navigator.style 可以设置一些内外边距，背景等样式，不能影响内容的布局；
- ...

```
<View style={[styles.container, this.props.style}>
  <View style={styles.transitioner}>
    <View style={[styles.baseScene, this.props.sceneStyle, disabledSceneStyle]}>
      {this.props.renderScene(...)}
    </View>
  </View>
  <Navigator.NavigationBar .../>
</View>
container = { flex: 1, overflow: hidden };
transitioner = { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' };
baseScene = {
  position: 'absolute',
  overflow: 'hidden',
  left: 0,
  right: 0,
  bottom: 0,
  top: 0,
};
```

## Navigator.NavigationBar
- Android

    - 导航条高度为 56dp
    - 导航条标题距离左侧 72dp，注意左侧一般只有一个导航，返回或关闭图标，不能显示上一视图的标题
    - 导航条图片大小为 24dp，按压区域为 48dp
    - 最左侧和最右侧图标距离边界 4dp

- iOS：TODO

```
<View style={[styles.navBarContainer, styles.navigationStyles, this.props.style]}> 固定在顶部，可以覆盖导航条样式
  <View style={styles.title}> // 标题
    {this.props.routeMapper.Title()}
  </View>
  <View style={styles.leftButton}> // 左侧按钮
    {this.props.routeMapper.LeftButton()}
  </View>
  <View style={styles.rightButton}> // 右侧按钮
    {this.props.routeMapper.RightButton()}
  </View>
</View>
var NAV_BAR_HEIGHT = 56;
var TITLE_LEFT = 72;
var BUTTON_SIZE = 24;
var TOUCH_TARGT_SIZE = 48;
var BUTTON_HORIZONTAL_MARGIN = 16
var BUTTON_EFFECTIVE_MARGIN = BUTTON_HORIZONTAL_MARGIN - (TOUCH_TARGT_SIZE - BUTTON_SIZE) / 2;
var NAV_ELEMENT_HEIGHT = NAV_BAR_HEIGHT;
navBarContainer = { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'transparent',};
navigationStyles: { height: NAV_BAR_HEIGHT };
title = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  alignItems: 'flex-start',
  height: NAV_ELEMENT_HEIGHT,
  backgroundColor: 'transparent',
  marginLeft: TITLE_LEFT,
};
leftButton = {
  position: 'absolute',
  top: 0,
  left: BUTTON_EFFECTIVE_MARGIN,
  overflow: 'hidden',
  height: NAV_ELEMENT_HEIGHT,
  backgroundColor: 'transparent',
}
rightButton = {
  position: 'absolute',
  top: 0,
  right: BUTTON_EFFECTIVE_MARGIN,
  overflow: 'hidden',
  alignItems: 'flex-end',
  height: NAV_ELEMENT_HEIGHT,
  backgroundColor: 'transparent',
}
```
