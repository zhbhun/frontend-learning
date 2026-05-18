import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function ClipPathTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(
    null,
  )
  const [clipPathType, setClipPathType] = useState<string>('none')

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f5f5f5',
    })

    fabricCanvasRef.current = canvas

    // 添加一些初始对象用于测试
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: '#ff6b6b',
      stroke: '#333',
      strokeWidth: 2,
    })

    const circle = new fabric.Circle({
      left: 300,
      top: 100,
      radius: 60,
      fill: '#4ecdc4',
      stroke: '#333',
      strokeWidth: 2,
    })

    const text = new fabric.IText('ClipPath测试文本', {
      left: 500,
      top: 100,
      fontSize: 24,
      fill: '#45b7d1',
      fontWeight: 'bold',
    })

    // 添加一个渐变矩形用于更好的视觉效果
    const gradient = new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: 200, y2: 0 },
      colorStops: [
        { offset: 0, color: '#ff9a9e' },
        { offset: 0.5, color: '#fecfef' },
        { offset: 1, color: '#fecfef' },
      ],
    })

    const gradientRect = new fabric.Rect({
      left: 100,
      top: 250,
      width: 200,
      height: 120,
      fill: gradient,
      stroke: '#333',
      strokeWidth: 2,
    })

    // 添加一个图案矩形
    const patternRect = new fabric.Rect({
      left: 350,
      top: 250,
      width: 180,
      height: 120,
      fill: '#96ceb4',
      stroke: '#333',
      strokeWidth: 2,
    })

    canvas.add(rect, circle, text, gradientRect, patternRect)

    // 选择事件
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0]
      if (obj) {
        setSelectedObject(obj)
      }
    })

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0]
      if (obj) {
        setSelectedObject(obj)
      }
    })

    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    return () => {
      canvas.dispose()
    }
  }, [])

    // 创建圆形剪切路径
  const createCircleClipPath = (targetObject: fabric.Object) => {
    const objWidth = targetObject.width! * (targetObject.scaleX || 1)
    const objHeight = targetObject.height! * (targetObject.scaleY || 1)
    const radius = Math.min(objWidth, objHeight) / 2

    return new fabric.Circle({
      objectCaching: false,
      radius: radius,
      originX: 'center',
      originY: 'center',
    })
  }

    // 创建矩形剪切路径
  const createRectClipPath = (targetObject: fabric.Object) => {
    const objWidth = targetObject.width! * (targetObject.scaleX || 1)
    const objHeight = targetObject.height! * (targetObject.scaleY || 1)

    return new fabric.Rect({
      objectCaching: false,
      width: objWidth * 0.6,
      height: objHeight * 0.6,
      originX: 'center',
      originY: 'center',
    })
  }

    // 创建星形剪切路径
  const createStarClipPath = (targetObject: fabric.Object) => {
    const objWidth = targetObject.width! * (targetObject.scaleX || 1)
    const objHeight = targetObject.height! * (targetObject.scaleY || 1)
    const size = Math.min(objWidth, objHeight) * 0.8

    const starPath = 'M 0,-50 L 14.69,-15.45 L 47.55,-15.45 L 23.78,2.73 L 38.47,36.27 L 0,18.18 L -38.47,36.27 L -23.78,2.73 L -47.55,-15.45 L -14.69,-15.45 Z'
    return new fabric.Path(starPath, {
      objectCaching: false,
      originX: 'center',
      originY: 'center',
      scaleX: size / 100,
      scaleY: size / 100,
    })
  }

    // 创建心形剪切路径
  const createHeartClipPath = (targetObject: fabric.Object) => {
    const objWidth = targetObject.width! * (targetObject.scaleX || 1)
    const objHeight = targetObject.height! * (targetObject.scaleY || 1)
    const size = Math.min(objWidth, objHeight) * 0.8

    const heartPath = 'M 0,20 C -20,0 -40,0 -40,-20 C -40,-40 -20,-40 0,-20 C 20,-40 40,-40 40,-20 C 40,0 20,0 0,20 Z'
    return new fabric.Path(heartPath, {
      objectCaching: false,
      originX: 'center',
      originY: 'center',
      scaleX: size / 80,
      scaleY: size / 80,
    })
  }

    // 创建多边形剪切路径
  const createPolygonClipPath = (targetObject: fabric.Object) => {
    const objWidth = targetObject.width! * (targetObject.scaleX || 1)
    const objHeight = targetObject.height! * (targetObject.scaleY || 1)
    const size = Math.min(objWidth, objHeight) * 0.6

    const points = [
      { x: 0, y: -size },
      { x: size * 0.7, y: -size * 0.3 },
      { x: size, y: 0 },
      { x: size * 0.7, y: size * 0.3 },
      { x: 0, y: size },
      { x: -size * 0.7, y: size * 0.3 },
      { x: -size, y: 0 },
      { x: -size * 0.7, y: -size * 0.3 },
    ]
    return new fabric.Polygon(points, {
      objectCaching: false,
      originX: 'center',
      originY: 'center',
    })
  }

  // 应用剪切路径
  const applyClipPath = (type: string) => {
    if (!fabricCanvasRef.current || !selectedObject) {
      return
    }

    let clipPath: fabric.Object | null = null

    switch (type) {
      case 'circle':
        clipPath = createCircleClipPath(selectedObject)
        break
      case 'rect':
        clipPath = createRectClipPath(selectedObject)
        break
      case 'star':
        clipPath = createStarClipPath(selectedObject)
        break
      case 'heart':
        clipPath = createHeartClipPath(selectedObject)
        break
      case 'polygon':
        clipPath = createPolygonClipPath(selectedObject)
        break
      default:
        clipPath = null
    }

    selectedObject.clipPath = clipPath || undefined
    selectedObject.set('dirty', true)
    setClipPathType(type)
    fabricCanvasRef.current.renderAll()
  }

  // 移除剪切路径
  const removeClipPath = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    selectedObject.clipPath = undefined
    selectedObject.set('dirty', true)
    setClipPathType('none')
    fabricCanvasRef.current.renderAll()
  }

  // 添加新对象
  const addTestObject = (type: 'rect' | 'circle' | 'text' | 'image') => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    let obj: fabric.Object

    switch (type) {
      case 'rect':
        obj = new fabric.Rect({
          left: Math.random() * 500 + 50,
          top: Math.random() * 300 + 50,
          width: 120,
          height: 80,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
        })
        break
      case 'circle':
        obj = new fabric.Circle({
          left: Math.random() * 500 + 50,
          top: Math.random() * 300 + 50,
          radius: 50,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
        })
        break
      case 'text':
        obj = new fabric.IText(`测试文本${Math.floor(Math.random() * 100)}`, {
          left: Math.random() * 400 + 50,
          top: Math.random() * 300 + 50,
          fontSize: 24,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          fontWeight: 'bold',
        })
        break
      case 'image': {
        // 创建一个有图案的矩形模拟图像
        const gradient = new fabric.Gradient({
          type: 'radial',
          coords: { x1: 60, y1: 60, x2: 60, y2: 60, r1: 0, r2: 60 },
          colorStops: [
            { offset: 0, color: '#ffeaa7' },
            { offset: 0.5, color: '#fab1a0' },
            { offset: 1, color: '#e17055' },
          ],
        })
        obj = new fabric.Rect({
          left: Math.random() * 400 + 50,
          top: Math.random() * 300 + 50,
          width: 120,
          height: 120,
          fill: gradient,
          stroke: '#333',
          strokeWidth: 2,
        })
        break
      }
      default:
        return
    }

    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
  }

  // 动画剪切路径
  const animateClipPath = () => {
    if (!selectedObject || !selectedObject.clipPath) {
      return
    }

    const clipPath = selectedObject.clipPath
    const originalScale = clipPath.scaleX || 1

    // 使用 fabric.util.animate 进行缩放动画
    fabric.util.animate({
      startValue: originalScale,
      endValue: originalScale * 1.5,
      duration: 500,
      onChange: (value) => {
        clipPath.set('scaleX', value)
        clipPath.set('scaleY', value)
        selectedObject.set('dirty', true)
        fabricCanvasRef.current?.renderAll()
      },
      onComplete: () => {
        fabric.util.animate({
          startValue: originalScale * 1.5,
          endValue: originalScale,
          duration: 500,
          onChange: (value) => {
            clipPath.set('scaleX', value)
            clipPath.set('scaleY', value)
            selectedObject.set('dirty', true)
            fabricCanvasRef.current?.renderAll()
          },
        })
      },
    })
  }

  // 旋转剪切路径
  const rotateClipPath = () => {
    if (!selectedObject || !selectedObject.clipPath) {
      return
    }

    const clipPath = selectedObject.clipPath
    const currentAngle = clipPath.angle || 0

    // 使用 fabric.util.animate 进行旋转动画
    fabric.util.animate({
      startValue: currentAngle,
      endValue: currentAngle + 90,
      duration: 300,
      onChange: (value) => {
        clipPath.set('angle', value)
        selectedObject.set('dirty', true)
        fabricCanvasRef.current?.renderAll()
      },
    })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 overflow-y-auto bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          ClipPath 剪切路径测试
        </h1>

        <div className="space-y-6">
          {/* 添加对象 */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              添加测试对象
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addTestObject('rect')}
                className="rounded bg-red-500 px-3 py-2 text-sm text-white transition-colors hover:bg-red-600"
              >
                矩形
              </button>
              <button
                onClick={() => addTestObject('circle')}
                className="rounded bg-green-500 px-3 py-2 text-sm text-white transition-colors hover:bg-green-600"
              >
                圆形
              </button>
              <button
                onClick={() => addTestObject('text')}
                className="rounded bg-blue-500 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600"
              >
                文本
              </button>
              <button
                onClick={() => addTestObject('image')}
                className="rounded bg-purple-500 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-600"
              >
                图案
              </button>
            </div>
          </div>

          {/* 剪切路径类型 */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              剪切路径类型
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => applyClipPath('circle')}
                disabled={!selectedObject}
                className="w-full rounded bg-cyan-500 px-4 py-2 text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                圆形剪切
              </button>
              <button
                onClick={() => applyClipPath('rect')}
                disabled={!selectedObject}
                className="w-full rounded bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                矩形剪切
              </button>
              <button
                onClick={() => applyClipPath('star')}
                disabled={!selectedObject}
                className="w-full rounded bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                星形剪切
              </button>
              <button
                onClick={() => applyClipPath('heart')}
                disabled={!selectedObject}
                className="w-full rounded bg-pink-500 px-4 py-2 text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                心形剪切
              </button>
              <button
                onClick={() => applyClipPath('polygon')}
                disabled={!selectedObject}
                className="w-full rounded bg-emerald-500 px-4 py-2 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                多边形剪切
              </button>
              <button
                onClick={removeClipPath}
                disabled={!selectedObject}
                className="w-full rounded bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                移除剪切路径
              </button>
            </div>
          </div>

          {/* 动画控制 */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              剪切路径动画
            </h3>
            <div className="space-y-2">
              <button
                onClick={animateClipPath}
                disabled={!selectedObject || !selectedObject.clipPath}
                className="w-full rounded bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                缩放动画
              </button>
              <button
                onClick={rotateClipPath}
                disabled={!selectedObject || !selectedObject.clipPath}
                className="w-full rounded bg-teal-500 px-4 py-2 text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                旋转剪切路径
              </button>
            </div>
          </div>

          {/* 选中对象信息 */}
          {selectedObject && (
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 text-lg font-semibold text-blue-800">
                选中对象信息
              </h3>
              <div className="space-y-1 text-sm text-blue-700">
                <p>类型: {selectedObject.type}</p>
                <p>
                  位置: ({selectedObject.left?.toFixed(0)},{' '}
                  {selectedObject.top?.toFixed(0)})
                </p>
                <p>
                  尺寸: {selectedObject.width?.toFixed(0)} ×{' '}
                  {selectedObject.height?.toFixed(0)}
                </p>
                <p>
                  当前剪切路径: {clipPathType === 'none' ? '无' : clipPathType}
                </p>
                <p>有剪切路径: {selectedObject.clipPath ? '是' : '否'}</p>
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="rounded-lg bg-green-50 p-4">
            <h3 className="mb-2 text-lg font-semibold text-green-800">使用说明</h3>
            <div className="space-y-1 text-sm text-green-700">
              <p>1. 点击"添加测试对象"按钮创建对象</p>
              <p>2. <strong>选择画布中的对象</strong></p>
              <p>3. 选择剪切路径类型进行应用</p>
              <p>4. 可以对剪切路径进行动画操作</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex-1 p-6">
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <canvas
              ref={canvasRef}
              className="rounded border border-gray-300"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClipPathTester
