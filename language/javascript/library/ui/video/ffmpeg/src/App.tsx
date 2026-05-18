import React, { useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";

const ffmpeg = new FFmpeg();

function App() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
      setOutputUrl(null);
    }
  };

  const handleCompress = async () => {
    if (!fileInputRef.current?.files?.[0]) return;
    const startTime = performance.now();
    setLoading(true);
    setOutputUrl(null);
    const file = fileInputRef.current.files[0];
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }
    console.log('>> ffmped loaded');
    // 读取文件为 Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    await ffmpeg.writeFile("input.mp4", new Uint8Array(arrayBuffer));
    console.log('>> ffmped writed');
    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-c:v",
      "libx265",
      // "-tag:v",
      // "avc1",
      "-movflags",
      "faststart",
      "-preset",
      "fast",
      "-crf",
      "23",
      "output.mp4"
    ]);
    console.log('>> ffmped processed');
    const data = await ffmpeg.readFile("output.mp4");
    console.log('>> ffmped read');
    let blob: Blob;
    if (data instanceof Uint8Array) {
      blob = new Blob([data], { type: "video/mp4" });
    } else {
      blob = new Blob([new TextEncoder().encode(data)], { type: "video/mp4" });
    }
    const url = URL.createObjectURL(blob);
    setOutputUrl(url);
    setLoading(false);
    const endTime = performance.now();
    if (outputRef.current) {
      outputRef.current.innerHTML = `>> ffmped processed in ${(endTime - startTime) / 1000}s`;
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h2>FFmpeg 视频压缩示例</h2>
      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {videoSrc && (
        <div style={{ margin: '16px 0' }}>
          <video src={videoSrc} controls width={320} />
        </div>
      )}
      <button onClick={handleCompress} disabled={loading || !videoSrc} style={{ marginRight: 8 }}>
        {loading ? "压缩中..." : "压缩视频"}
      </button>
      {outputUrl && (
        <div style={{ marginTop: 16 }}>
          <h4>压缩后的视频：</h4>
          <video src={outputUrl} controls width={320} />
          <div>
            <a href={outputUrl} download="compressed.mp4">下载压缩后视频</a>
          </div>
        </div>
      )}
      <div ref={outputRef} />
    </div>
  );
}

export default App;
