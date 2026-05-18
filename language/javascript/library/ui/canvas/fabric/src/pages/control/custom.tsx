import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'

const CustomControlDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(
    null,
  )

  // 删除对象的处理函数
  const deleteObject = useCallback(
    (_eventData: fabric.TPointerEvent, transform: fabric.Transform) => {
      const canvas = transform.target.canvas
      canvas?.remove(transform.target)
      canvas?.renderAll()
      return true
    },
    [],
  )

  // 复制对象的处理函数
  const cloneObject = useCallback(
    (_eventData: fabric.TPointerEvent, transform: fabric.Transform) => {
      const canvas = transform.target.canvas
      const target = transform.target

      target.clone().then((cloned: fabric.Object) => {
        cloned.set({
          left: (target.left || 0) + 20,
          top: (target.top || 0) + 20,
        })
        canvas?.add(cloned)
        canvas?.setActiveObject(cloned)
        canvas?.renderAll()
      })
      return true
    },
    [],
  )

  // 锁定/解锁对象的处理函数
  const toggleObjectLock = useCallback(
    (_eventData: fabric.TPointerEvent, transform: fabric.Transform) => {
      const target = transform.target
      const isLocked = target.lockMovementX

      target.set({
        lockMovementX: !isLocked,
        lockMovementY: !isLocked,
        lockScalingX: !isLocked,
        lockScalingY: !isLocked,
        lockRotation: !isLocked,
      })

      const canvas = fabricCanvasRef.current
      canvas?.renderAll()
      return true
    },
    [],
  )

  // 显示对象信息的处理函数
  const showObjectInfo = useCallback(
    (_eventData: fabric.TPointerEvent, transform: fabric.Transform) => {
      const target = transform.target
      const info = `对象类型: ${target.type}
位置: (${Math.round(target.left || 0)}, ${Math.round(target.top || 0)})
尺寸: ${Math.round(target.width || 0)} × ${Math.round(target.height || 0)}
旋转角度: ${Math.round(target.angle || 0)}°
缩放: ${target.scaleX?.toFixed(2)} × ${target.scaleY?.toFixed(2)}`

      alert(info)
      return true
    },
    [],
  )

  // 渲染删除图标
  const renderDeleteIcon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      _styleOverride: Record<string, unknown>,
      fabricObject: fabric.Object,
    ) => {
      const size = 24
      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0))

      // 绘制圆形背景
      ctx.fillStyle = '#ff4444'
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, 2 * Math.PI)
      ctx.fill()

      // 绘制删除图标 (X)
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-6, -6)
      ctx.lineTo(6, 6)
      ctx.moveTo(6, -6)
      ctx.lineTo(-6, 6)
      ctx.stroke()

      ctx.restore()
    },
    [],
  )

  // 渲染复制图标
  const renderCloneIcon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      _styleOverride: Record<string, unknown>,
      fabricObject: fabric.Object,
    ) => {
      const size = 24
      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0))

      // 绘制圆形背景
      ctx.fillStyle = '#2196F3'
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, 2 * Math.PI)
      ctx.fill()

      // 绘制复制图标 (两个重叠的矩形)
      ctx.strokeStyle = 'white'
      ctx.fillStyle = 'white'
      ctx.lineWidth = 1.5

      // 后面的矩形
      ctx.strokeRect(-4, -4, 6, 6)
      // 前面的矩形
      ctx.fillRect(-2, -2, 6, 6)
      ctx.strokeStyle = '#2196F3'
      ctx.strokeRect(-2, -2, 6, 6)

      ctx.restore()
    },
    [],
  )

  // 渲染锁定图标
  const renderLockIcon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      _styleOverride: Record<string, unknown>,
      fabricObject: fabric.Object,
    ) => {
      const size = 24
      const isLocked = fabricObject.lockMovementX

      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0))

      // 绘制圆形背景
      ctx.fillStyle = isLocked ? '#ff9800' : '#4caf50'
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, 2 * Math.PI)
      ctx.fill()

      // 绘制锁图标
      ctx.strokeStyle = 'white'
      ctx.fillStyle = 'white'
      ctx.lineWidth = 2

      if (isLocked) {
        // 锁定状态 - 闭合的锁
        ctx.strokeRect(-4, -2, 8, 6)
        ctx.beginPath()
        ctx.arc(0, -4, 3, Math.PI, 0, false)
        ctx.stroke()
      } else {
        // 解锁状态 - 开放的锁
        ctx.strokeRect(-4, -2, 8, 6)
        ctx.beginPath()
        ctx.arc(-1, -4, 3, Math.PI, 0, false)
        ctx.stroke()
      }

      ctx.restore()
    },
    [],
  )

  // 渲染信息图标
  const renderInfoIcon = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      left: number,
      top: number,
      _styleOverride: Record<string, unknown>,
      fabricObject: fabric.Object,
    ) => {
      const size = 24
      ctx.save()
      ctx.translate(left, top)
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0))

      // 绘制圆形背景
      ctx.fillStyle = '#9c27b0'
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, 2 * Math.PI)
      ctx.fill()

      // 绘制信息图标 (i)
      ctx.fillStyle = 'white'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('i', 0, 0)

      ctx.restore()
    },
    [],
  )

  // 创建自定义控制点函数
  const createCustomControls = useCallback(
    () => ({
      deleteControl: new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -16,
        cursorStyle: 'pointer',
        mouseUpHandler: deleteObject,
        render: renderDeleteIcon,
      }),
      cloneControl: new fabric.Control({
        x: -0.5,
        y: -0.5,
        offsetY: -16,
        offsetX: -24,
        cursorStyle: 'pointer',
        mouseUpHandler: cloneObject,
        render: renderCloneIcon,
      }),
      lockControl: new fabric.Control({
        x: 0.5,
        y: 0.5,
        offsetY: 16,
        cursorStyle: 'pointer',
        mouseUpHandler: toggleObjectLock,
        render: renderLockIcon,
      }),
      infoControl: new fabric.Control({
        x: -0.5,
        y: 0.5,
        offsetY: 16,
        offsetX: -24,
        cursorStyle: 'help',
        mouseUpHandler: showObjectInfo,
        render: renderInfoIcon,
      }),
    }),
    [
      deleteObject,
      cloneObject,
      toggleObjectLock,
      showObjectInfo,
      renderDeleteIcon,
      renderCloneIcon,
      renderLockIcon,
      renderInfoIcon,
    ],
  )

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8f9fa',
    })

    fabricCanvasRef.current = canvas

    // 创建测试对象 - 使用官方推荐的方式设置控制点
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 150,
      height: 100,
      fill: '#4CAF50',
      stroke: '#2E7D32',
      strokeWidth: 2,
      rx: 10,
      ry: 10,
      controls: {
        ...fabric.Rect.createControls().controls,
        ...createCustomControls(),
      },
    })

    const circle = new fabric.Circle({
      left: 350,
      top: 100,
      radius: 60,
      fill: '#2196F3',
      stroke: '#1976D2',
      strokeWidth: 2,
      controls: {
        ...fabric.Circle.createControls().controls,
        ...createCustomControls(),
      },
    })

    const triangle = new fabric.Triangle({
      left: 550,
      top: 100,
      width: 120,
      height: 100,
      fill: '#FF9800',
      stroke: '#F57C00',
      strokeWidth: 2,
      controls: {
        ...fabric.Triangle.createControls().controls,
        ...createCustomControls(),
      },
    })

    const text = new fabric.FabricText('自定义控制点', {
      left: 200,
      top: 300,
      fontSize: 24,
      fill: '#9C27B0',
      fontFamily: 'Arial',
      controls: {
        ...fabric.FabricText.createControls().controls,
        ...createCustomControls(),
      },
    })

    // 添加对象到画布
    canvas.add(rect, circle, triangle, text)

    // 监听选择事件
    canvas.on('selection:created', (e: { selected?: fabric.Object[] }) => {
      const obj = e.selected?.[0]
      setSelectedObject(obj || null)
    })

    canvas.on('selection:updated', (e: { selected?: fabric.Object[] }) => {
      const obj = e.selected?.[0]
      setSelectedObject(obj || null)
    })

    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
    })

    // 清理函数
    return () => {
      canvas.dispose()
    }
  }, [createCustomControls])

  // 添加新对象的函数
  const addNewRect = () => {
    if (!fabricCanvasRef.current) return

    const newRect = new fabric.Rect({
      left: Math.random() * 400 + 50,
      top: Math.random() * 300 + 50,
      width: 100,
      height: 80,
      fill: '#' + Math.floor(Math.random() * 16777215).toString(16),
      stroke: '#333',
      strokeWidth: 2,
      rx: 5,
      ry: 5,
      controls: {
        ...fabric.Rect.createControls().controls,
        ...createCustomControls(),
      },
    })

    fabricCanvasRef.current.add(newRect)
    fabricCanvasRef.current.setActiveObject(newRect)
    fabricCanvasRef.current.renderAll()
  }

  const addNewCircle = () => {
    if (!fabricCanvasRef.current) return

    const newCircle = new fabric.Circle({
      left: Math.random() * 400 + 50,
      top: Math.random() * 300 + 50,
      radius: 40,
      fill: '#' + Math.floor(Math.random() * 16777215).toString(16),
      stroke: '#333',
      strokeWidth: 2,
      controls: {
        ...fabric.Circle.createControls().controls,
        ...createCustomControls(),
      },
    })

    fabricCanvasRef.current.add(newCircle)
    fabricCanvasRef.current.setActiveObject(newCircle)
    fabricCanvasRef.current.renderAll()
  }

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return
    fabricCanvasRef.current.clear()
    fabricCanvasRef.current.backgroundColor = '#f8f9fa'
    fabricCanvasRef.current.renderAll()
    setSelectedObject(null)
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">
        自定义控制点演示
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 画布区域 */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">画布</h2>
            <div className="overflow-hidden rounded-lg border-2 border-gray-300">
              <canvas ref={canvasRef} className="mx-auto block" />
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>• 选择对象后会显示自定义控制点</p>
              <p>• 🔴 删除按钮：点击删除对象</p>
              <p>• 🔵 复制按钮：点击复制对象</p>
              <p>• 🟡/🟢 锁定按钮：点击锁定/解锁对象</p>
              <p>• 🟣 信息按钮：点击查看对象详细信息</p>
            </div>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="space-y-6">
          {/* 当前选中对象信息 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">选中对象</h3>
            {selectedObject ? (
              <div className="space-y-2 text-sm">
                <p>
                  <strong>类型:</strong> {selectedObject.type}
                </p>
                <p>
                  <strong>位置:</strong> ({Math.round(selectedObject.left || 0)}
                  , {Math.round(selectedObject.top || 0)})
                </p>
                <p>
                  <strong>尺寸:</strong> {Math.round(selectedObject.width || 0)}{' '}
                  × {Math.round(selectedObject.height || 0)}
                </p>
                <p>
                  <strong>旋转:</strong> {Math.round(selectedObject.angle || 0)}
                  °
                </p>
                <p>
                  <strong>锁定状态:</strong>{' '}
                  {selectedObject.lockMovementX ? '已锁定' : '未锁定'}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">未选中任何对象</p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">操作</h3>
            <div className="space-y-3">
              <button
                onClick={addNewRect}
                className="w-full rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
              >
                添加矩形
              </button>
              <button
                onClick={addNewCircle}
                className="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                添加圆形
              </button>
              <button
                onClick={clearCanvas}
                className="w-full rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
              >
                清空画布
              </button>
            </div>
          </div>

          {/* 自定义控制点说明 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">自定义控制点说明</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  ✕
                </div>
                <span>删除控制点 - 删除选中对象</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                  ⧉
                </div>
                <span>复制控制点 - 复制选中对象</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                  🔒
                </div>
                <span>锁定控制点 - 锁定/解锁对象</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
                  i
                </div>
                <span>信息控制点 - 显示对象信息</span>
              </div>
            </div>
          </div>

          {/* 技术实现要点 */}
          <div className="rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold">技术实现要点</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 使用官方推荐的方式：在对象创建时传入 controls 属性</p>
              <p>• 使用 fabric.Control 创建自定义控制点</p>
              <p>• 通过 render 函数自定义控制点外观</p>
              <p>• 通过 mouseUpHandler 定义点击行为</p>
              <p>• 使用 x, y 属性定位控制点位置</p>
              <p>• 使用 offsetX, offsetY 微调位置</p>
              <p>• 使用 createControls() 保留原有默认控制点</p>
              <p>• 使用 useCallback 优化性能和依赖管理</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomControlDemo
