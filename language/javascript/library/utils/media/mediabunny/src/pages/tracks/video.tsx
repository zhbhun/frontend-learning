import { useState } from 'react';
import { Input, ALL_FORMATS, BlobSource, UrlSource } from 'mediabunny';

interface VideoTrackInfo {
  duration: number;
  totalTracks: number;
  videoTrack?: {
    displayWidth: number;
    displayHeight: number;
    rotation: number;
    averageFrameRate: number;
    codec?: string;
  };
}

export default function VideoTrackReader() {
  const [videoUrl, setVideoUrl] = useState('');
  const [trackInfo, setTrackInfo] = useState<VideoTrackInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeVideo = async (source: BlobSource | UrlSource) => {
    setLoading(true);
    setError(null);
    setTrackInfo(null);

    try {
      const input = new Input({
        formats: ALL_FORMATS,
        source,
      });

      // Get duration
      const duration = await input.computeDuration();

      // Get all tracks
      const allTracks = await input.getTracks();

      // Get primary video track
      const videoTrack = await input.getPrimaryVideoTrack();

      const info: VideoTrackInfo = {
        duration,
        totalTracks: allTracks.length,
      };

      if (videoTrack) {
        // Compute packet stats to estimate frame rate
        const packetStats = await videoTrack.computePacketStats(100);

        info.videoTrack = {
          displayWidth: videoTrack.displayWidth,
          displayHeight: videoTrack.displayHeight,
          rotation: videoTrack.rotation,
          averageFrameRate: packetStats.averagePacketRate,
          codec: videoTrack.codec ?? undefined,
        };
      }

      setTrackInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析视频失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await analyzeVideo(new BlobSource(file));
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    await analyzeVideo(new UrlSource(videoUrl));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          视频轨道信息读取器
        </h1>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            选择本地视频文件
          </h2>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
        </div>

        {/* URL Input Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            或输入视频地址
          </h2>
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              分析
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700">正在分析视频...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">错误: {error}</p>
          </div>
        )}

        {/* Results */}
        {trackInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              视频信息
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-gray-700">时长:</span>
                <span className="text-gray-900">
                  {trackInfo.duration.toFixed(2)} 秒
                </span>
              </div>

              <div className="flex justify-between py-2 border-b">
                <span className="font-medium text-gray-700">轨道总数:</span>
                <span className="text-gray-900">{trackInfo.totalTracks}</span>
              </div>

              {trackInfo.videoTrack && (
                <>
                  <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800">
                    视频轨道信息
                  </h3>

                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">分辨率:</span>
                    <span className="text-gray-900">
                      {trackInfo.videoTrack.displayWidth} x{' '}
                      {trackInfo.videoTrack.displayHeight}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">旋转角度:</span>
                    <span className="text-gray-900">
                      {trackInfo.videoTrack.rotation}°
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium text-gray-700">帧率:</span>
                    <span className="text-gray-900">
                      {trackInfo.videoTrack.averageFrameRate.toFixed(2)} FPS
                    </span>
                  </div>

                  {trackInfo.videoTrack.codec && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-700">编解码器:</span>
                      <span className="text-gray-900">
                        {trackInfo.videoTrack.codec}
                      </span>
                    </div>
                  )}
                </>
              )}

              {!trackInfo.videoTrack && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-yellow-700">未找到视频轨道</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
