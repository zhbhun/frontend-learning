// {{component}}.js
interface ComponentData {
  count: number
}

type ComponentProperty = {
  step: NumberConstructor
}

type ComponentMethods = {
  handleClick(e: WechatMiniprogram.TouchEvent): void
}

Component<ComponentData, ComponentProperty, ComponentMethods>({
  /**
   * 组件的属性列表
   */
  properties: {
    step: Number
  },

  /**
   * 组件的初始数据
   */
  data: {
    count: 1
  },

  /**
   * 组件的方法列表
   */
  methods: {
    handleClick(e) {
      this.setData({
        count: this.data.count + this.data.step
      })
      console.log(e.detail, this.data.count, this.data.step)
    }
  }
})
