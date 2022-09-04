## @ant-design/pro-field

- valueType：值类型

    - text：文本
    - password：密码
    - money：金额
    - index：序号
    - indexBorder：？
    - option：？
    - textarea：多行文本
    - date：日期
    - dateWeek：周
    - dateMonth：月
    - dateQuarter：季
    - dateYear：年
    - dateTime：日期时间
    - fromNow：？
    - dateRange：日期区域
    - dateTimeRange：日期时间区域
    - time：时间
    - timeRange：事件区域
    - select：选择
    - checkbox：复选框
    - rate：评分
    - slider：滑动条
    - radio：单选框
    - radioButton：单选框按钮
    - progress：进度
    - percent：百分比
    - digit：数字
    - digitRange：？
    - second：？
    - code：?
    - jsonCode：？
    - avatar：？
    - switch：开关
    - image：？
    - cascader：级联选择器
    - treeSelect：树形选择器
    - color：颜色选择器

- mode

    - read：只读
    - edit/update：编辑

- readonly：只读
- placeholder：占位
- text：用于只读模式显示文案
- emptyText：用于只读模式内容为空时的占位（默认 -）
- fieldProps：控件属性
- render(text, props, dom)：自定义只读文本渲染
- renderFormItem(text, props, dom)：自定义编辑控件渲染

### select

- valueEnum：映射值的类型
- request：从服务器读取选项
- params：重新触发的时机
- light：轻量模式
- bordered：是否显示边框

## @ant-design/pr-form

### ProFormControl

表单项

- ...https://ant.design/components/form-cn/#Form.Item
- transform：？
- dataFormat：？
- proFormFieldKey：？

---

控件

- fieldProps：控件属性
- proFieldProps：ProField 上面的 Props，内部属性
- placeholder：输入的描述，没有值的时候展示
- disabled：是否禁用
- width：宽度

   - auto 使用组件默认的宽度
   - xs=104px 适用于短数字、短文本或选项。
   - sm=216px 适用于较短字段录入、如姓名、电话、ID 等。
   - md=328px 标准宽度，适用于大部分字段长度。
   - lg=440px 适用于较长字段录入，如长网址、标签组、文件路径等。
   - xl=552px 适用于长文本录入，如长链接、描述、备注等，通常搭配自适应多行输入框或定高文本域使用。

- addonBefore：前置的dom
- addonAfter：后置的dom

---

Grid

- grid
- colProps
- rowProps

---

扩展：给控件扩展的通用的属性

- allowClear：是否允许情况
- bordered：边框
- colSize：列大小
- params：参数
- ignoreFormItem：需要放在formItem 时使用
- convertValue：获取时转化值，一般用于将数据格式化为组件接收的格式
- readonly：只读
- formItemProps
- filedConfig：给自定义组件行为开的口子

    - valueType：自定义类型
    - customLightMode：自定义 lightMode
    - defaultProps：默认的props，如果用户设置会被覆盖
    - ignoreWidth：不使用默认的宽度

- fieldRef
