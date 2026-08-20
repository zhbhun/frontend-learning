#!/bin/bash
# 验证 electrobun build 产物的 macOS 签名与公证状态。
# 用法：bash verify-signature.sh <产物路径>
#   产物路径可以是 .app（自解压壳留在 build/{env}-macos-arm64/ 下）或 .dmg
#   （artifacts/ 目录）。四个命令均取自 electrobun CLI 源码中的验证注释。
# 前提：macOS 主机、已安装 Xcode Command Line Tools（codesign / spctl / stapler）。
# 预期：已签名且已公证的产物，三项检查全部通过；DMG 的 spctl 会输出
#   "rejected (the code is valid but does not seem to be an app)"——这是 DMG
#   的正常响应（它不是 app），真正的失败信号是 "source=no usable signature"。
set -uo pipefail

if [ $# -ne 1 ]; then
  echo "用法：bash verify-signature.sh <path-to.app|path-to.dmg>"
  exit 2
fi

TARGET="$1"

if [ ! -e "$TARGET" ]; then
  echo "产物不存在：$TARGET"
  exit 2
fi

echo "=== 1/3 签名完整性（codesign --verify --deep --strict） ==="
codesign --verify --deep --strict --verbose=2 "$TARGET"
CODESIGN_OK=$?

echo ""
echo "=== 2/3 Gatekeeper 评估（spctl --assess --type execute） ==="
# .app 期望 accepted；.dmg 出现 "rejected (…does not seem to be an app)" 属正常
spctl --assess --type execute --verbose "$TARGET"
SPCTL_OK=$?

echo ""
echo "=== 3/3 公证票据（stapler validate） ==="
xcrun stapler validate -v "$TARGET"
STAPLER_OK=$?

echo ""
echo "汇总：codesign=$CODESIGN_OK spctl=$SPCTL_OK stapler=$STAPLER_OK（0 为通过）"
