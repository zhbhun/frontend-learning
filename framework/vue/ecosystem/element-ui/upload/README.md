# 上传

Element 定义了自己的文件对象。

```ts
interface UploadFile {
  name: string;
  status: 'ready' | 'fail' | 'success';
  uid: number;
  url: string;
  // 新增上传文件的特有信息
  raw: File;
  size: number;
  percentage: number;
  response: any;
}
```

## 基础

### 受控 VS 非受控

#### 非受控用法

可以通过 `file-list` 设置初始默认值，使用过程中不修改 `file-list` 的话，upload 组件会在内部自行维护文件列表状态。

1. `on-change(file, fileList)`：选择文件后触发，file 为选中的文件（状态为 ready），fileList 为文件列表，包含刚选中的文件

    ps：如果同时选中多个文件，会触发多次事件

2. `on-success(response, file, fileList)`：上传成功后触发，file 的状态变为 'success'

    上传成功后，会针对上传成功的文件再次触发一遍 change 事件？

3. `on-error`：上传失败时触发，file 的状态变为 'fail'

    上传失败时，会针对上传失败的文件再次触发一遍 change 事件，表示从列表中删除了对应文件。

4. `on-remove(file, fileList)`：。。。

#### 受控用法

通过 file-list 控制 upload 的上传列表，change 和 remove 的时候需要同步更新 file-list 的值（拷贝新的数组）。

## 上传文件校验

设置 `before-upload`

## 自定义上传逻辑

设置 `http-request`

## 问题

- 上传多个文件时，如果超出个数限制，怎么隐藏上传按钮。
- 如何去掉上传动画

## 实际应用

### 上传单图/视频

### 上传多图/视频

上传失败的图片是否需要显示在列表中（默认是不展示的）？

### 上传文件(列表)
