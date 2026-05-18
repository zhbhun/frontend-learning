import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function DragDropTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [draggedObjects, setDraggedObjects] = useState<fabric.Object[]>([])
  const [constraintMode, setConstraintMode] = useState<'none' | 'grid'>('none')
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize, setGridSize] = useState(20)
  const dropZonesRef = useRef<fabric.Rect[]>([])
  const [dragInfo, setDragInfo] = useState<{object: string, position: string} | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8fafc',
      selection: true,
      preserveObjectStacking: true,
    })

    fabricCanvasRef.current = canvas
    console.log('Canvas initialized')

    // 添加一个测试对象
    const testRect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 80,
      height: 60,
      fill: '#3b82f6',
      stroke: '#2563eb',
      strokeWidth: 2,
      rx: 5,
      ry: 5,
    })

    canvas.add(testRect)

    // 创建拖放区域
    const dropZone = new fabric.Rect({
      left: 500,
      top: 200,
      width: 200,
      height: 150,
      fill: 'transparent',
      stroke: '#10b981',
      strokeWidth: 3,
      strokeDashArray: [10, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })

    canvas.add(dropZone)
    dropZonesRef.current = [dropZone]

        // 添加拖拽事件监听
    canvas.on('object:moving', (e) => {
      const obj = e.target
      if (!obj) return

      let newLeft = obj.left!
      let newTop = obj.top!

      // 约束拖拽
      if (constraintMode === 'grid' && snapToGrid) {
        newLeft = Math.round(newLeft / gridSize) * gridSize
        newTop = Math.round(newTop / gridSize) * gridSize
      }

      // 边界约束
      const objWidth = (obj.width! * obj.scaleX!) || 0
      const objHeight = (obj.height! * obj.scaleY!) || 0

      newLeft = Math.max(0, Math.min(canvas.width! - objWidth, newLeft))
      newTop = Math.max(0, Math.min(canvas.height! - objHeight, newTop))

      obj.set({
        left: newLeft,
        top: newTop
      })

      // 检查是否在放置区域内
      const dropZone = dropZonesRef.current[0]
      const inDropZone = dropZone &&
        newLeft >= dropZone.left! &&
        newLeft + objWidth <= dropZone.left! + dropZone.width! &&
        newTop >= dropZone.top! &&
        newTop + objHeight <= dropZone.top! + dropZone.height!

      // 高亮放置区域
      if (dropZone) {
        dropZone.set({
          fill: inDropZone ? 'rgba(16, 185, 129, 0.2)' : 'transparent'
        })
      }

      setDragInfo({
        object: `${obj.type}`,
        position: `X: ${newLeft.toFixed(0)}, Y: ${newTop.toFixed(0)}${inDropZone ? ' [在放置区域内]' : ''}`
      })

      canvas.renderAll()
    })

    // 拖拽结束事件
    canvas.on('object:modified', (e) => {
      const obj = e.target
      if (!obj) return

      // 清除放置区域高亮
      const dropZone = dropZonesRef.current[0]
      if (dropZone) {
        dropZone.set({ fill: 'transparent' })
      }

      // 检查最终位置是否在放置区域内
      const objWidth = (obj.width! * obj.scaleX!) || 0
      const objHeight = (obj.height! * obj.scaleY!) || 0

      const inDropZone = dropZone &&
        obj.left! >= dropZone.left! &&
        obj.left! + objWidth <= dropZone.left! + dropZone.width! &&
        obj.top! >= dropZone.top! &&
        obj.top! + objHeight <= dropZone.top! + dropZone.height!

      if (inDropZone) {
        console.log('🎉 成功放置到区域!')

        // 添加放置成功的视觉反馈
        obj.set({
          stroke: '#10b981',
          strokeWidth: 4
        })

        setTimeout(() => {
          obj.set({
            stroke: obj.get('originalStroke') || obj.stroke,
            strokeWidth: obj.get('originalStrokeWidth') || obj.strokeWidth
          })
          canvas.renderAll()
        }, 1000)
      } else {
        console.log('❌ 未在放置区域内')
      }

      setDragInfo(null)
      canvas.renderAll()
    })

    // 保存原始样式
    testRect.set({
      originalStroke: testRect.stroke,
      originalStrokeWidth: testRect.strokeWidth
    })





    canvas.on('selection:created', (e) => {
      const objects = e.selected || []
      setDraggedObjects(objects)
      console.log(`🎯 选择创建: ${objects.length} 个对象`)
    })

    canvas.on('selection:updated', (e) => {
      const objects = e.selected || []
      setDraggedObjects(objects)
      console.log(`🔄 选择更新: ${objects.length} 个对象`)
    })

    canvas.on('selection:cleared', () => {
      setDraggedObjects([])
      console.log('❌ 选择清除')
    })

    return () => {
      canvas.dispose()
    }
  }, [constraintMode, snapToGrid, gridSize])

  const setConstraint = (mode: 'none' | 'grid') => {
    setConstraintMode(mode)
    console.log(`🔧 切换约束模式: ${mode}`)
  }

  const toggleSnapToGrid = () => {
    setSnapToGrid(!snapToGrid)
    console.log(`📐 网格吸附: ${!snapToGrid ? '开启' : '关闭'}`)
  }



  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current

    // 清除所有对象
    canvas.clear()
    canvas.backgroundColor = '#f8fafc'

    // 重新添加测试对象和放置区域
    const testRect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 80,
      height: 60,
      fill: '#3b82f6',
      stroke: '#2563eb',
      strokeWidth: 2,
      rx: 5,
      ry: 5,
    })

    const dropZone = new fabric.Rect({
      left: 500,
      top: 200,
      width: 200,
      height: 150,
      fill: 'transparent',
      stroke: '#10b981',
      strokeWidth: 3,
      strokeDashArray: [10, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,

    })

    testRect.set({
      originalStroke: testRect.stroke,
      originalStrokeWidth: testRect.strokeWidth
    })

    canvas.add(testRect, dropZone)
    dropZonesRef.current = [dropZone]

    canvas.renderAll()
    setDraggedObjects([])
    console.log('🔄 重置画布')
  }

  const resetDropZones = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current

    // 清除现有放置区域
    dropZonesRef.current.forEach(zone => canvas.remove(zone))

    // 重新创建放置区域
    const newDropZone = new fabric.Rect({
      left: 500,
      top: 200,
      width: 200,
      height: 150,
      fill: 'transparent',
      stroke: '#10b981',
      strokeWidth: 3,
      strokeDashArray: [10, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,

    })

    canvas.add(newDropZone)
    dropZonesRef.current = [newDropZone]
    canvas.renderAll()
    console.log('🎯 重置放置区域')
  }

  // 拖拽外部元素到画布
  const handleDragStart = (e: React.DragEvent, objectType: string) => {
    e.dataTransfer.setData('text/plain', objectType)
    console.log(`🚀 开始拖拽外部元素: ${objectType}`)
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()

    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objectType = e.dataTransfer.getData('text/plain')

    // 获取鼠标相对于画布的位置
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']
    const color = colors[Math.floor(Math.random() * colors.length)]

    let obj: fabric.Object

    switch (objectType) {
      case 'external-rect':
        obj = new fabric.Rect({
          left: x - 40,
          top: y - 30,
          width: 80,
          height: 60,
          fill: color,
          stroke: '#374151',
          strokeWidth: 2,
          rx: 5,
          ry: 5
        })
        break
      case 'external-circle':
        obj = new fabric.Circle({
          left: x - 30,
          top: y - 30,
          radius: 30,
          fill: color,
          stroke: '#374151',
          strokeWidth: 2
        })
        break
      case 'external-triangle':
        obj = new fabric.Triangle({
          left: x - 30,
          top: y - 30,
          width: 60,
          height: 60,
          fill: color,
          stroke: '#374151',
          strokeWidth: 2
        })
        break
      case 'external-text':
        obj = new fabric.IText('新文本', {
          left: x - 25,
          top: y - 10,
          fontSize: 18,
          fill: color,
          fontFamily: 'Arial',
          editable: false
        })
        break
      default:
        return
    }

    obj.set({
      originalStroke: obj.stroke,
      originalStrokeWidth: obj.strokeWidth
    })

    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
    console.log(`📥 从外部拖入对象: ${objectType} 到位置 (${x.toFixed(0)}, ${y.toFixed(0)})`)
  }

  const getConstraintColor = () => {
    switch (constraintMode) {
      case 'grid':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧控制面板 */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
            拖拽释放测试
          </h1>

          {/* 拖拽约束 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">拖拽约束</h3>
            <div className="space-y-2">
              <button
                onClick={() => setConstraint('none')}
                className={`w-full p-3 rounded-lg border-2 transition-all ${
                  constraintMode === 'none'
                    ? 'bg-gray-500 text-white border-gray-500'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">自由拖拽</div>
                <div className="text-sm opacity-90">无任何约束</div>
              </button>

              <button
                onClick={() => setConstraint('grid')}
                className={`w-full p-3 rounded-lg border-2 transition-all ${
                  constraintMode === 'grid'
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <div className="font-medium">网格约束</div>
                <div className="text-sm opacity-90">按网格移动</div>
              </button>
            </div>

            <div className={`mt-3 p-3 rounded-lg border ${getConstraintColor()}`}>
              <div className="text-sm">
                <strong>当前约束:</strong> {constraintMode === 'none' ? '自由拖拽' : '网格约束'}
              </div>
            </div>
          </div>

          {/* 网格设置 */}
          {constraintMode === 'grid' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">网格设置</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    网格大小: {gridSize}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <button
                  onClick={toggleSnapToGrid}
                  className={`w-full p-2 rounded border transition-colors ${
                    snapToGrid
                      ? 'bg-purple-500 text-white border-purple-500'
                      : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  网格吸附: {snapToGrid ? '开启' : '关闭'}
                </button>
              </div>
            </div>
          )}

          {/* 外部拖拽元素 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">从外部拖入</h3>
            <div className="text-sm text-gray-600 mb-3">
              拖拽矩形到画布上
            </div>
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'external-rect')}
              className="bg-blue-500 text-white p-4 rounded cursor-move hover:bg-blue-600 transition-colors text-center"
            >
              🟦 矩形
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">操作</h3>
            <div className="space-y-2">
              <button
                onClick={resetDropZones}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors"
              >
                重置放置区域
              </button>
              <button
                onClick={clearCanvas}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
              >
                重置画布
              </button>
            </div>
          </div>

          {/* 拖拽状态信息 */}
                      {dragInfo && (
              <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">拖拽状态</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>对象:</strong> {dragInfo.object}</p>
                  <p><strong>位置:</strong> {dragInfo.position}</p>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  💡 实时检测是否在放置区域内
                </div>
              </div>
            )}

          {/* 选中对象信息 */}
          {draggedObjects.length > 0 && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-green-800">当前选中</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p className="font-medium">数量: {draggedObjects.length}</p>
                {draggedObjects.map((obj, index) => (
                  <div key={index} className="pl-2 border-l-2 border-green-300">
                    <p>
                      <span className="font-medium">对象{index + 1}:</span> {obj.type}
                    </p>
                    <p className="text-xs text-green-600">
                      位置: ({obj.left?.toFixed(0)}, {obj.top?.toFixed(0)})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧画布区域 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-lg p-4 h-full">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                拖拽画布 - 约束模式: <span className={`px-2 py-1 rounded text-sm ${getConstraintColor()}`}>
                  {constraintMode === 'none' ? '自由拖拽' : '网格约束'}
                </span>
              </h2>
              <div className="text-sm text-gray-600 mt-2">
                • 拖拽蓝色矩形到绿色虚线框内 • 进入放置区域时会高亮显示 • 支持网格约束和边界限制
              </div>
            </div>
            <canvas
              ref={canvasRef}
              className="border border-gray-300 rounded"
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DragDropTester
