# 上传组件

## 特性

### 图片选择

- capture：图片选取模式，可选值为 camera (直接调起摄像头)
- accept：设置可选择的图片
- directory：支持上传文件夹
- multiple：是否开启图片多选

### 图片校验

- maxCount：限制上传数量
- maxSize：文件最大限制，单位为 byte
- minSize：文件最小限制，单位为 byte
- resolution：图片/视频分辨率限制

    ```ts
    interface Resolution {
      width?: number;
      height?: number;
      maxWidth?: number;
      maxHeight?: number;
      minWidth?: number;
      minHeight?: number
    }
    ```

问题

- 怎么处理多选的文件数量超出梳理限制的情况？

    - vant：自动丢弃多余的文件
    - antd：同上

- 怎么处理不符合要求文件大小或分辨率的文件（是否显示在列表）？

    - vant：自动丢弃不符合要求的文件，并向外抛出事件（可监听实现错误提示）
    - antd：不自带文件限制，可以通过 beforeUpload 来实现自定义校验和处理行为，见下文

### 上传钩子

- beforeRead/beforeUpload：文件读取前的回调函数，参数为上传的文件（`File`），可以在该方法对上传文件进行校验
- afterRead/customRequest：文件读取完成后的回调函数，参数为封装后的上传文件对象，可以在该方法自定义上传行为

    ```ts
    interface UploadFile {
      /** 唯一 ID */
      uid: string;
      /** 文件名 */
      name: string;
      /** 上传进度 */
      percent: number;
      /** 文件状态 */
      status: 'idle' | 'uploading' | 'done' | 'failed';
      /** 缩略图地址 */
      thumbUrl: string;
      /** 下载地址 */
      url: string;
    }
    ```

问题：

- 怎么处理自定义校验不通过的文件，（是否显示在列表）？

    - vant：beforeRead 返回 false 可终止文件读取（不会上传也不会进入列表）
    - antd：antd 可以控制是否上传和是否进入列表显示

        - beforeUpload 返回 false 或 Promise.reject，会拦截上传行为，但不会阻止文件进入上传列表（错误状态）；
        - beforeUpload 返回 Upload.LIST_IGNOR

    ps：可以通过额外的配置项来决定是否要在列表里显示校验不通过的图片。

- 怎么处理上传失败的图片？

    - 不在列表显示，通过消息提示 —— 单文件体验可以，但多文件列表存在闪烁（原来在列表中的突然会消失），不容易知道哪张图片上传失败了。
    - 在列表显示 —— 解决了多文件列表闪烁问题

    ps：可以提供额外的配置项来控制上传失败的图片是否显示在列表

## 上传控制

- disabled：是否禁用文件上传
- readonly：是否将上传区域设置为只读状态
- uploadIcon：上传图标
- uploadText：上传文案
- children：自定义上传区域

## 文件列表

- showList：是否显示文件列表，不显示可以自定义
- listType：列表样式（text, card）

    - text：文本样式，用于非图片和视频上传
    - card：卡片样式，用户图片和视频上传

- listCardSize：列表卡片大小
- deleteIcon：删除图片
- deletable：是否可以删除
- previewIcon：预览图标
- previewable：是否可以预览
- previewOptions：预览的配置项
- reuploadIcon：重新上传图标
- reuploadable：是否可以重新上传
- renderListItem：自定义渲染列表项

    ```ts
    renderListItem(originNode: ReactElement, file: UploadFile, fileList: object[], actions: { delete: function, preview: function, upload: function }): React.ReactNode
    ```

- renderUploadProgress：自定义上传进度条样式

    ```ts
    renderListItem(originNode: ReactElement, file: UploadFile, fileList: object[])
    ```

## 事件回调

- onChange：上传文件改变时的状态
- onDelete：点击移除文件时的回调
- onPreview：点击文件链接或预览图标时的回调
