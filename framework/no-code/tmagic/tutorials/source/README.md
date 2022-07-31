## 初始化渲染传值流程

- https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/editor/src/Editor.vue#L198

    Editor 监听 modelValue 变化，然后设置到 editorService

- https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/editor/src/layouts/workspace/Stage.vue#L180

    Stage 监听从 editorService 中取出的 root 值变化

- https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/runtime/vue3/src/playground/App.vue#L49

## 值更新流程

- 触发变化

    - 右侧面板更新

        https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/editor/src/layouts/PropsPanel.vue#L66
    
    - 画布更新

        - https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/stage/src/StageDragResize.ts#L461
        - https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/stage/src/StageCore.ts#L136
        - https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/editor/src/layouts/workspace/Stage.vue#L139

- https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/editor/src/services/editor.ts#L441

    调用 editorService 的 update

- https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/stage/src/StageCore.ts#L233

    调用 StageCore 的 update

- https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/runtime/vue3/src/playground/App.vue#L83

    调用 App 注册的 update

## 选中流程

- StageMask 监听 mousedown 事件

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/stage/src/StageMask.ts#L106

- StageMask 处理 mousedown 事件

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/stage/src/StageMask.ts#L303

- StageCore 监听 StageMask beforeSelect 事件

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/stage/src/StageCore.ts#L88

- StageCore 通过点击事件获取选中的目标元素

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/packages/stage/src/StageCore.ts#L90

- StageCore 执行选中操作 

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de470cffcb3c1bb133d8a55b316b6eb6/packages/stage/src/StageCore.ts#L194

- 执行 Runtime 的 select 操作

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de470cffcb3c1bb133d8a55b316b6eb6/packages/stage/src/StageCore.ts#L202

    =>

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de/runtime/vue3/src/playground/App.vue#L63

- 执行 StageMask setLayout

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de470cffcb3c1bb133d8a55b316b6eb6/packages/stage/src/StageCore.ts#L208

- 执行 StageDragResize select

    https://github.com/Tencent/tmagic-editor/blob/8e1e7ef0de470cffcb3c1bb133d8a55b316b6eb6/packages/stage/src/StageCore.ts#L209

## 属性更新
