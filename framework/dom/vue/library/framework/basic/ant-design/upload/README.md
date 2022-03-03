# 上传组件

```ts
interface UploadFile {
  status: string; // 状态有：uploading done error removed
  uid: string; // 文件唯一标识，建议设置为负数，防止和内部产生的 id 冲突
  name: string; // 文件名
  type?: string;
  size?: number;
  percent?: number;
  lastModified?: number,
  lastModifiedDate?: Date,
  response?: {
    status: string;
  }; // 服务端响应内容
  error?: Event;
  originFileObj?: File;
}
```
