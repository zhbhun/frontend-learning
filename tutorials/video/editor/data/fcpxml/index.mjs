#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, readdirSync, statSync, createWriteStream } from 'fs';
import { basename, resolve, relative, join } from 'path';
import { pathToFileURL } from 'url';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';

/**
 * 获取视频文件的元数据
 */
function getVideoMetadata(filePath) {
  const result = execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(result);
}

/**
 * 将秒转换为 FCPXML 时间格式 (帧数/帧率s)
 * FCPXML 使用分数形式表示时间，如 152/30s
 */
function secondsToFCPXMLTime(seconds, frameRate) {
  const totalFrames = Math.round(seconds * frameRate);
  return `${totalFrames}/${frameRate}s`;
}

/**
 * 生成 FCPXML 格式的剪辑项目文件
 */
function generateFCPXML(videos, outputDir) {
  const fcpxmlVersion = '1.11';
  const projectFrameRate = 30; // 项目帧率

  let totalDuration = 0;
  const assets = [];
  const clips = [];

  videos.forEach((video, index) => {
    const metadata = getVideoMetadata(video.path);
    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

    const duration = parseFloat(metadata.format.duration);
    const videoFrameRate = eval(videoStream.r_frame_rate); // 视频实际帧率
    const width = videoStream.width;
    const height = videoStream.height;

    // 资源 ID
    const assetId = `r${index + 1}`;

    // 剪映对资源地址更敏感，使用绝对 file URI 可避免“媒体丢失”
    const fileUri = pathToFileURL(video.path).href;

    // 添加资源
    assets.push({
      id: assetId,
      name: video.name,
      src: fileUri,
      duration: duration,
      hasAudio: !!audioStream,
      videoStream,
      audioStream
    });

    // 添加片段 - 使用视频实际时长
    const clipDuration = secondsToFCPXMLTime(duration, projectFrameRate);
    const timelineStart = secondsToFCPXMLTime(totalDuration, projectFrameRate);

    clips.push({
      id: `clip_${index + 1}`,
      assetId,
      name: basename(video.name, '.mp4'),
      offset: '0s',
      duration: clipDuration,
      timelineStart,
      videoStream,
      audioStream,
      actualDuration: duration
    });

    totalDuration += duration;
  });

  // 生成 FCPXML XML
  const fcpxml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="${fcpxmlVersion}">
  <resources>
    <format id="r0" name="FFVideoFormat1080p${projectFrameRate}" frameDuration="1/${projectFrameRate}s" width="1920" height="1080"/>
${assets.map((asset, i) => `    <asset id="${asset.id}" name="${asset.name}" src="${asset.src}" duration="${secondsToFCPXMLTime(asset.duration, projectFrameRate)}" hasVideo="1" hasAudio="${asset.hasAudio ? '1' : '0'}">
      <mediaRep kind="original"/>
    </asset>`).join('\n')}
  </resources>
  <library>
    <event name="视频拼接">
      <project name="拼接项目">
        <sequence duration="${secondsToFCPXMLTime(totalDuration, projectFrameRate)}" format="r0">
          <spine>
${clips.map(clip => `            <clip name="${clip.name}" offset="${clip.timelineStart}" duration="${clip.duration}">
              <video offset="${clip.offset}" ref="${clip.assetId}" duration="${clip.duration}"/>
${clip.audioStream ? `              <audio offset="${clip.offset}" ref="${clip.assetId}" duration="${clip.duration}"/>` : ''}
            </clip>`).join('\n')}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;

  return { fcpxml, totalDuration, clips };
}

/**
 * 创建包含视频和 FCPXML 的压缩包
 */
async function createPackage(videoDir, videos, fcpxmlContent, outputPath) {
  const { mkdirSync, rmSync, copyFileSync } = await import('fs');

  const tmpDir = join(videoDir, '.tmp_pkg');

  // 创建临时目录
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  // 复制视频文件到临时目录
  videos.forEach(video => {
    copyFileSync(video.path, join(tmpDir, video.name));
  });

  // 写入 FCPXML 文件
  writeFileSync(join(tmpDir, 'concat.fcpxml'), fcpxmlContent, 'utf-8');

  // 使用系统 zip 命令创建压缩包
  const files = [...videos.map(v => v.name), 'concat.fcpxml'];
  execSync(`cd "${tmpDir}" && zip -q "${outputPath}" ${files.join(' ')}`);

  // 清理临时目录
  rmSync(tmpDir, { recursive: true, force: true });
}

// 主程序
const videoDir = resolve('.');
const videos = [
  { path: resolve(videoDir, '1.mp4'), name: '1.mp4' },
  { path: resolve(videoDir, '2.mp4'), name: '2.mp4' }
];

const { fcpxml, totalDuration, clips } = generateFCPXML(videos, videoDir);

// 保存 FCPXML 文件
const fcpxmlPath = resolve(videoDir, 'concat.fcpxml');
writeFileSync(fcpxmlPath, fcpxml, 'utf-8');

console.log(`✅ FCPXML 文件已生成: ${fcpxmlPath}`);
console.log(`📹 总时长: ${totalDuration.toFixed(2)} 秒`);
console.log(`🎬 包含 ${videos.length} 个视频片段:`);
clips.forEach((clip, i) => {
  console.log(`   - ${clip.name}: ${clip.actualDuration.toFixed(2)}s (${clip.duration})`);
});

// 创建压缩包
const packagePath = resolve(videoDir, 'video-concat.zip');
await createPackage(videoDir, videos, fcpxml, packagePath);
console.log(`📦 压缩包已创建: ${packagePath}`);
