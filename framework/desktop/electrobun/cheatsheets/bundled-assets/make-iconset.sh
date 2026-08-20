#!/usr/bin/env bash
# 从单张 1024x1024 PNG 生成 macOS 应用图标需要的 icon.iconset 目录。
# 前置：macOS（sips 系统自带）；源图是不透明的正方形 PNG，边长 >= 1024。
# 操作：bash make-iconset.sh <源图.png> [输出目录，默认 ./icon.iconset]
# 预期结果：输出目录内出现 icon_16x16.png 到 icon_512x512@2x.png 共 10 张
# 标准命名 PNG；把目录放回工程根（build.mac.icons 默认就是 "icon.iconset"），
# 重新 bunx electrobun build 后，应用包 Resources/AppIcon.icns 即由它生成。
set -euo pipefail

src="${1:?用法: bash make-iconset.sh <1024x1024.png> [输出目录]}"
out="${2:-icon.iconset}"

if [ ! -f "$src" ]; then
  echo "源图不存在: $src" >&2
  exit 1
fi

mkdir -p "$out"
for size in 16 32 128 256 512; do
  # iconutil 要求精确的文件名；@2x 是 2 倍边长（16@2x = 32x32 … 512@2x = 1024x1024）
  sips -z "$size" "$size" "$src" --out "$out/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$src" --out "$out/icon_${size}x${size}@2x.png" >/dev/null
done

echo "已生成 $out（10 张 PNG）。放回工程根目录后重新构建即可生效。"
