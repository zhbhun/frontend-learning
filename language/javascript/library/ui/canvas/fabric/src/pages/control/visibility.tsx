import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

const ControlVisibilityDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f5f5f5'
    });

    // 创建一些基础对象用于演示
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

    // 添加对象到画布
    canvas.add(rect, circle, triangle);

    // 监听选择事件
    canvas.on('selection:created', (e: { selected?: fabric.Object[] }) => {
      setSelectedObject(e.selected?.[0] || null);
      customizeControlsForObject(canvas, e.selected?.[0]);
    });

    canvas.on('selection:updated', (e: { selected?: fabric.Object[] }) => {
      setSelectedObject(e.selected?.[0] || null);
      customizeControlsForObject(canvas, e.selected?.[0]);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // 清理函数
    return () => {
      canvas.dispose();
    };
  }, []);

  // 根据对象类型自定义 control 样式
  const customizeControlsForObject = (canvas: fabric.Canvas, obj: fabric.Object | undefined) => {
    if (!obj) return;

    // 为矩形显示所有控制点
    if (obj instanceof fabric.Rect) {
      obj.setControlsVisibility({
        mt: true,
        mb: true,
        ml: true,
        mr: true,
        tl: true,
        tr: true,
        bl: true,
        br: true
      });
    }

    // 为圆形只显示四角控制点
    if (obj instanceof fabric.Circle) {
      obj.setControlsVisibility({
        mt: false,
        mb: false,
        ml: false,
        mr: false,
        tl: true,
        tr: true,
        bl: true,
        br: true
      });
    }

    // 为三角形只显示四角控制点
    if (obj instanceof fabric.Triangle) {
      obj.setControlsVisibility({
        mt: false,
        mb: false,
        ml: false,
        mr: false,
        tl: true,
        tr: true,
        bl: true,
        br: true
      });
    }

    canvas.renderAll();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-800">
          Fabric.js Control 显示定制演示
        </h1>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1">
            <div className="overflow-hidden rounded-lg border-2 border-gray-200 bg-white shadow-lg">
              <canvas ref={canvasRef} />
            </div>
          </div>

          <div className="w-full max-w-md lg:w-96">
            <div className="rounded-lg bg-white p-6 shadow-lg border border-gray-200">
              <h3 className="mb-4 text-lg font-semibold text-gray-700 border-b-2 border-gray-200 pb-2">
                控制说明
              </h3>
              <ul className="space-y-2 mb-6">
                <li className="text-gray-600">
                  <span className="font-semibold text-gray-700">默认控制点</span>: 使用 Fabric.js 内置的控制点样式
                </li>
                <li className="text-gray-600">
                  <span className="font-semibold text-gray-700">对象选择</span>: 点击对象查看详细信息
                </li>
                <li className="text-gray-600">
                  <span className="font-semibold text-gray-700">控制点显示</span>: 根据对象类型显示不同控制点
                </li>
              </ul>

              <h3 className="mb-4 text-lg font-semibold text-gray-700 border-b-2 border-gray-200 pb-2">
                自定义特性
              </h3>
              <ul className="space-y-2 mb-6">
                <li className="text-gray-600">保持默认控制点功能</li>
                <li className="text-gray-600">动态控制点显示</li>
                <li className="text-gray-600">根据对象类型显示不同控制点</li>
                <li className="text-gray-600">实时显示选中对象信息</li>
              </ul>

              {selectedObject && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <h4 className="text-lg font-semibold text-blue-800 mb-3">
                    当前选中对象
                  </h4>
                  <div className="space-y-2">
                    <p className="text-blue-700">
                      <span className="font-medium">类型:</span> {selectedObject.type}
                    </p>
                    <p className="text-blue-700">
                      <span className="font-medium">位置:</span> ({Math.round(selectedObject.left!)}, {Math.round(selectedObject.top!)})
                    </p>
                    {selectedObject instanceof fabric.Rect && (
                      <p className="text-blue-700">
                        <span className="font-medium">圆角:</span> {selectedObject.rx}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlVisibilityDemo;
