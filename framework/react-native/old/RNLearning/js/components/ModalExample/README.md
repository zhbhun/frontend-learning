# 内容
Modal 上显示的内容均作为子组件设置。

# 样式
Modal 就是个占据真个屏幕的视图容器，不管放在哪个组件下都是如此。

- `visible`：是否显示 Modal
- `transparent`

    默认情况下，Modal 是个白色背景的全屏视图容器，`transparent` 为 false。`transparent` 设置为 true 时，Modal 背景色变为透明。

备注：Modal 不支持 style，所以不能直接给 Modal 设置背景样式为透明色来使背景变成透明，也不能调整 Modal 大小，需要的话在子组件内实现。

# 动画
- `animationType`

# 事件
- `onShow`
- `onRequestClose`
- `onOrientationChange`：iOS

# 兼容性
- Android 必须设置属性 `onRequestClose`，在用户按了返回键时调用，可用于关闭 Modal；

# 实际应用
- 全屏窗口

    ```
    <Modal
      transparent={false}
    >
      <View style={styles.modalContainer}> // 设置背景
        ...
      </View>
    </Modal>
    // modalContainer: { flex: 1, backgoundColor: '#fff' }
    ```

- 带遮挡层的小窗口

    ```
    <Modal
      transparent={true}
    >
      <View style={styles.modalBackdrop}> // 遮挡层：设置透明灰色背景
        <View style={styles.modalLayout}> // 布局容器：内容放置位置，一般居中
          <View style={styles.modalContent}> // 内容容器：设置背景和边框
           ...
          </View>
        </View>
      </View>
    </Modal>
    // modalBackdrop: { flex: 1, backgoundColor: 'rgba(0, 0, 0, 0.5)' }
    // modalLayout: { flex: 1, justifyContent: 'center' }
    // modalContent: { backgoundColor: '#fff', borderRadius: 10 }
    ```

# TODO
- 在 Modal 显示动画结束的回调函数，如果 Modal 中有输入框需要或许焦点，不要放在 componentDidMount里，要放在在 onShow 里面处理，避免影响动画
