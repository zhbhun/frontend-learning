# 本机最小验证:签名状态的真实命令

Storybook 里的流水线是模拟,不执行 codesign / signtool。本文件给出在本机核对课程结论的最小命令,全部为只读检查(查看系统里已有的签名状态),不需要开发者账号,也不需要构建 Tauri 工程;第 3 步是可选对照,需要[第一个应用](?path=/docs/first-app--docs)生成的工程。

## 1 macOS:查看本机签名身份

1. 运行 `security find-identity -v -p codesigning`。

预期:列出钥匙串里的代码签名身份。装过 Xcode 的免费账号通常只有一条 `Apple Development: ...`——这是课程「签名身份」中免费账号边界的直接证据;付费账号能看到 `Developer ID Application: ...` 条目。

## 2 macOS:读取一个已分发应用的信任链

1. 任选一个系统自带应用,运行 `codesign -dv --verbose=2 /Applications/Safari.app 2>&1`,再运行 `spctl -a -vv /Applications/Safari.app`。

预期:第一条命令的 `Authority` 链显示 Apple 签发身份,`TeamIdentifier` 有值;第二条命令输出 `accepted`,即通过 Gatekeeper 评估。对照课程「公证与票据」的判断链:身份 → 公证 → 票据,任何一环缺失都会体现在评估结果里。

## 3 macOS:未配置签名的构建产物(可选对照)

1. 对一个未配置任何签名变量的 Tauri 工程执行 `npm run tauri build`,然后运行 `codesign -dv src-tauri/target/release/bundle/macos/*.app`。

预期:主二进制只有链接器留下的 ad-hoc 签名(`Signature=adhoc`),没有 `Authority` 行——对应课程实例里「macOS · 未配置」场景。把 .app 打包传到另一台 Mac 再解压打开,会看到「已损坏,无法打开」;本机直接运行不受影响。

## 4 Windows:查看证书商店

1. 在 Windows 主机的 PowerShell 运行 `Get-ChildItem Cert:\CurrentUser\My`。

预期:列出当前用户的个人证书。导入 .pfx 后会出现代码签名证书,其 Thumbprint 即 `certificateThumbprint` 的取值来源(与 certmgr.msc 详细信息页显示一致)。
