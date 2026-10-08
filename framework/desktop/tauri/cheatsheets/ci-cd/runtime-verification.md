# 本机最小验证:CI/CD 的真实运行行为

Storybook 里的 Canvas 是示意模拟,不执行 workflow、不发起构建。本文件给出把课程结论落到真实流水线的最小步骤,基于[第一个应用](?path=/docs/first-app--docs)生成的 React 工程与一个推送到 GitHub 的仓库;本机环境为 macOS(Apple Silicon)。

## 1 workflow 与首次运行

1. 把快速上手的 `publish.yml` 提交并推送后打 tag(如 `app-v0.0.1`)推上:Actions 页应出现 `publish-tauri` 的 4 个并行 job——对应实例顶部的触发行与矩阵。
2. 展开 ubuntu job:只有它有「install dependencies (ubuntu only)」步骤,其余 job 没有——对应矩阵小节的 `if` 条件与实例里的灰色跳过段。
3. 全部 job 变绿后到 Releases 页:出现草稿 `App v0.0.1`,资产含各平台安装包、`.sig` 与 `latest.json`;对应实例底部的 Release 面板。

## 2 权限与 secrets 的失败点

1. 故障注入(对应实例「只读(演示)」):把仓库 Settings → Actions → General → Workflow permissions 设为只读,并删掉 job 上的 `permissions` 块,重新打 tag 推送——构建照常成功,tauri-action 报 `Resource not accessible by integration`,不产生 Release。恢复 `contents: write` 后重跑。
2. 故障注入(对应实例「缺失(演示)」):配置过 updater 的工程先不配 `TAURI_SIGNING_PRIVATE_KEY` secret,推 tag——4 个 job 全部在 `tauri build` 失败,日志提示缺更新签名私钥;`fail-fast: false` 下每个 job 各自失败,互不影响。
3. 在 Settings → Secrets and variables → Actions 配好 `TAURI_SIGNING_PRIVATE_KEY`(值为 `myapp.key` 文件内容)重新触发:构建通过,Release 资产里出现 `.sig` 与 `latest.json`。

## 3 草稿发布与 updater 端点

1. 打开草稿 Release 里的 `latest.json`,确认各平台 `url` 指向同 Release 的资产地址;此时直接 `curl` 该地址应返回 404——草稿资产不对外公开,对应实例「Publish 前客户端拉不到产物」。
2. 手动 Publish 后再 `curl https://github.com/<owner>/<repo>/releases/latest/download/latest.json`:返回 200,客户端 updater 即可走通[自动更新](?path=/docs/updater--docs)的完整链路。
3. 缓存对比(对应实例「冷缓存(首次)」):比较同分支连续两次运行的「Rust cache」与 tauri build 步骤耗时,第二次明显缩短;真实差距远大于实例示意。
