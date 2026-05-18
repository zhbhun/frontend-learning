import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';

const ControlPropsDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [controlSettings, setControlSettings] = useState({
    cornerColor: '#00ff00',
    cornerStrokeColor: '#000000',
    cornerStyle: 'circle' as 'circle' | 'rect',
    transparentCorners: false,
    cornerSize: 20,
    padding: 10,
    hasControls: true,
    hasBorders: true,
    borderColor: '#000000',
    borderScaleFactor: 2,
    borderDashArray: [] as number[],
    rotatingPointOffset: 40,
  });

  // 应用控制点设置
  const applyControlSettings = useCallback((obj: fabric.Object, settings = controlSettings) => {
    if (!obj) return;

    // 设置控制点样式
    obj.setControlsVisibility({
      mt: true,  // 上中
      mb: true,  // 下中
      ml: true,  // 左中
      mr: true,  // 右中
      tl: true,  // 左上
      tr: true,  // 右上
      bl: true,  // 左下
      br: true,  // 右下
      mtr: true, // 旋转控制点
    });

    // 应用自定义控制点样式
    obj.set({
      cornerColor: settings.cornerColor,
      cornerStrokeColor: settings.cornerStrokeColor,
      cornerStyle: settings.cornerStyle,
      transparentCorners: settings.transparentCorners,
      cornerSize: settings.cornerSize,
      padding: settings.padding,
      hasControls: settings.hasControls,
      hasBorders: settings.hasBorders,
      borderColor: settings.borderColor,
      borderScaleFactor: settings.borderScaleFactor,
      borderDashArray: settings.borderDashArray,
      rotatingPointOffset: settings.rotatingPointOffset,
    });

    fabricCanvasRef.current?.renderAll();
  }, [controlSettings]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8f9fa'
    });

    fabricCanvasRef.current = canvas;

    // 创建测试对象
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: '#4CAF50',
      stroke: '#2E7D32',
      strokeWidth: 2,
      rx: 10,
      ry: 10
    });

    const circle = new fabric.Circle({
      left: 350,
      top: 100,
      radius: 60,
      fill: '#2196F3',
      stroke: '#1976D2',
      strokeWidth: 2
    });

    const triangle = new fabric.Triangle({
      left: 550,
      top: 100,
      width: 120,
      height: 100,
      fill: '#FF9800',
      stroke: '#F57C00',
      strokeWidth: 2
    });

    const text = new fabric.FabricText('Hello Fabric', {
      left: 100,
      top: 250,
      fontSize: 24,
      fill: '#9C27B0',
      fontFamily: 'Arial'
    });

    // 添加对象到画布
    canvas.add(rect, circle, triangle, text);

    // 监听选择事件
    canvas.on('selection:created', (e: { selected?: fabric.Object[] }) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj || null);
    });

    canvas.on('selection:updated', (e: { selected?: fabric.Object[] }) => {
      const obj = e.selected?.[0];
      setSelectedObject(obj || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // 清理函数
    return () => {
      canvas.dispose();
    };
  }, []);

  // 当选中对象或控制设置改变时，应用控制点设置
  useEffect(() => {
    if (selectedObject) {
      applyControlSettings(selectedObject);
    }
  }, [selectedObject, applyControlSettings]);

  // 更新控制点设置
  const updateControlSettings = (newSettings: Partial<typeof controlSettings>) => {
    const updatedSettings = { ...controlSettings, ...newSettings };
    setControlSettings(updatedSettings);

    if (selectedObject) {
      applyControlSettings(selectedObject, updatedSettings);
    }
  };

    // 重置控制点设置
  const resetControlSettings = () => {
    const defaultSettings = {
      cornerColor: '#00ff00',
      cornerStrokeColor: '#000000',
      cornerStyle: 'circle' as const,
      transparentCorners: false,
      cornerSize: 20,
      padding: 10,
      hasControls: true,
      hasBorders: true,
      borderColor: '#000000',
      borderScaleFactor: 2,
      borderDashArray: [],
      rotatingPointOffset: 40,
    };

    setControlSettings(defaultSettings);

    if (selectedObject) {
      applyControlSettings(selectedObject, defaultSettings);
    }
  };

    // 应用预设样式
  const applyPreset = (preset: string) => {
    let newSettings = { ...controlSettings };

    switch (preset) {
      case 'minimal':
        newSettings = {
          ...newSettings,
          cornerSize: 12,
          padding: 5,
          cornerColor: '#666666',
          hasBorders: false,
        };
        break;
      case 'bold':
        newSettings = {
          ...newSettings,
          cornerSize: 28,
          padding: 15,
          cornerColor: '#ff0000',
          borderScaleFactor: 4,
          borderColor: '#ff0000',
        };
        break;
      case 'dashed':
        newSettings = {
          ...newSettings,
          borderDashArray: [10, 5],
          borderColor: '#0066cc',
          cornerColor: '#0066cc',
        };
        break;
      case 'transparent':
        newSettings = {
          ...newSettings,
          transparentCorners: true,
          cornerColor: 'rgba(0, 255, 0, 0.5)',
          hasBorders: false,
        };
        break;
    }

    setControlSettings(newSettings);

    if (selectedObject) {
      applyControlSettings(selectedObject, newSettings);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Control 属性设置测试
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 画布区域 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-semibold mb-4">画布</h2>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="block mx-auto"
              />
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• 点击对象查看控制点</p>
              <p>• 拖拽控制点调整对象大小和形状</p>
              <p>• 拖拽旋转控制点旋转对象</p>
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="space-y-6">
          {/* 当前选中对象信息 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">选中对象</h3>
            {selectedObject ? (
              <div className="space-y-2 text-sm">
                <p><strong>类型:</strong> {selectedObject.type}</p>
                <p><strong>位置:</strong> ({Math.round(selectedObject.left || 0)}, {Math.round(selectedObject.top || 0)})</p>
                <p><strong>尺寸:</strong> {Math.round(selectedObject.width || 0)} × {Math.round(selectedObject.height || 0)}</p>
                <p><strong>旋转:</strong> {Math.round(selectedObject.angle || 0)}°</p>
              </div>
            ) : (
              <p className="text-gray-500">未选中任何对象</p>
            )}
          </div>

          {/* 控制点样式设置 */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3">控制点样式</h3>

            {/* 预设样式 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">预设样式</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyPreset('minimal')}
                  className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  简约
                </button>
                <button
                  onClick={() => applyPreset('bold')}
                  className="px-3 py-2 text-xs bg-red-100 hover:bg-red-200 rounded border"
                >
                  粗体
                </button>
                <button
                  onClick={() => applyPreset('dashed')}
                  className="px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 rounded border"
                >
                  虚线
                </button>
                <button
                  onClick={() => applyPreset('transparent')}
                  className="px-3 py-2 text-xs bg-green-100 hover:bg-green-200 rounded border"
                >
                  透明
                </button>
              </div>
            </div>

            {/* 控制点颜色 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                控制点颜色
              </label>
              <input
                type="color"
                value={controlSettings.cornerColor}
                onChange={(e) => updateControlSettings({ cornerColor: e.target.value })}
                className="w-full h-10 rounded border"
              />
            </div>

            {/* 控制点边框颜色 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                控制点边框颜色
              </label>
              <input
                type="color"
                value={controlSettings.cornerStrokeColor}
                onChange={(e) => updateControlSettings({ cornerStrokeColor: e.target.value })}
                className="w-full h-10 rounded border"
              />
            </div>

            {/* 控制点样式 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                控制点样式
              </label>
              <select
                value={controlSettings.cornerStyle}
                onChange={(e) => updateControlSettings({ cornerStyle: e.target.value as 'circle' | 'rect' })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="circle">圆形</option>
                <option value="rect">矩形</option>
              </select>
            </div>

            {/* 控制点大小 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                控制点大小: {controlSettings.cornerSize}
              </label>
              <input
                type="range"
                min="8"
                max="40"
                value={controlSettings.cornerSize}
                onChange={(e) => updateControlSettings({ cornerSize: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* 内边距 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                内边距: {controlSettings.padding}
              </label>
              <input
                type="range"
                min="0"
                max="30"
                value={controlSettings.padding}
                onChange={(e) => updateControlSettings({ padding: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* 旋转控制点偏移 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                旋转控制点偏移: {controlSettings.rotatingPointOffset}
              </label>
              <input
                type="range"
                min="20"
                max="80"
                value={controlSettings.rotatingPointOffset}
                onChange={(e) => updateControlSettings({ rotatingPointOffset: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* 复选框选项 */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={controlSettings.transparentCorners}
                  onChange={(e) => updateControlSettings({ transparentCorners: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">透明控制点</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={controlSettings.hasControls}
                  onChange={(e) => updateControlSettings({ hasControls: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">显示控制点</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={controlSettings.hasBorders}
                  onChange={(e) => updateControlSettings({ hasBorders: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">显示边框</span>
              </label>
            </div>

            {/* 边框设置 */}
            {controlSettings.hasBorders && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    边框颜色
                  </label>
                  <input
                    type="color"
                    value={controlSettings.borderColor}
                    onChange={(e) => updateControlSettings({ borderColor: e.target.value })}
                    className="w-full h-8 rounded border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    边框粗细: {controlSettings.borderScaleFactor}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={controlSettings.borderScaleFactor}
                    onChange={(e) => updateControlSettings({ borderScaleFactor: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* 重置按钮 */}
            <div className="mt-6">
              <button
                onClick={resetControlSettings}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                重置设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPropsDemo;

