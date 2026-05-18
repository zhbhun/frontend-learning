import { useRef, useEffect, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  PaintBrushIcon,
  ArrowPathIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline'

export interface BrushTesterProps {
  className?: string
}

type BrushType =
  | 'Pencil'
  | 'Circle'
  | 'Spray'
  | 'hline'
  | 'vline'
  | 'square'
  | 'diamond'
  | 'texture'

export function BrushTester({ className = '' }: BrushTesterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [isDrawingMode, setIsDrawingMode] = useState(true)
  const [drawingColor, setDrawingColor] = useState('#000000')
  const [drawingShadowColor, setDrawingShadowColor] = useState('#000000')
  const [drawingLineWidth, setDrawingLineWidth] = useState(5)
  const [drawingShadowWidth, setDrawingShadowWidth] = useState(0)
  const [drawingShadowOffset, setDrawingShadowOffset] = useState(0)
  const [selectedBrush, setSelectedBrush] = useState<BrushType>('Pencil')

  // 创建图案画笔
  const createPatternBrushes = useCallback((canvas: fabric.Canvas) => {
    const brushes: Record<string, fabric.PatternBrush> = {}

    // 水平线图案画笔
    if (fabric.PatternBrush) {
      const hLinePatternBrush = new fabric.PatternBrush(canvas)
      hLinePatternBrush.getPatternSrc = function () {
        const patternCanvas = fabric.getEnv().document.createElement('canvas')
        patternCanvas.width = patternCanvas.height = 10
        const ctx = patternCanvas.getContext('2d')!

        ctx.strokeStyle = this.color
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(0, 5)
        ctx.lineTo(10, 5)
        ctx.closePath()
        ctx.stroke()

        return patternCanvas
      }
      brushes.hline = hLinePatternBrush

      // 垂直线图案画笔
      const vLinePatternBrush = new fabric.PatternBrush(canvas)
      vLinePatternBrush.getPatternSrc = function () {
        const patternCanvas = fabric.getEnv().document.createElement('canvas')
        patternCanvas.width = patternCanvas.height = 10
        const ctx = patternCanvas.getContext('2d')!

        ctx.strokeStyle = this.color
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(5, 0)
        ctx.lineTo(5, 10)
        ctx.closePath()
        ctx.stroke()

        return patternCanvas
      }
      brushes.vline = vLinePatternBrush

      // 方形图案画笔
      const squarePatternBrush = new fabric.PatternBrush(canvas)
      squarePatternBrush.getPatternSrc = function () {
        const squareWidth = 10
        const squareDistance = 2

        const patternCanvas = fabric.getEnv().document.createElement('canvas')
        patternCanvas.width = patternCanvas.height =
          squareWidth + squareDistance
        const ctx = patternCanvas.getContext('2d')!

        ctx.fillStyle = this.color
        ctx.fillRect(0, 0, squareWidth, squareWidth)

        return patternCanvas
      }
      brushes.square = squarePatternBrush

      // 菱形图案画笔
      const diamondPatternBrush = new fabric.PatternBrush(canvas)
      diamondPatternBrush.getPatternSrc = function () {
        const squareWidth = 10
        const squareDistance = 5
        const patternCanvas = fabric.getEnv().document.createElement('canvas')
        const rect = new fabric.Rect({
          width: squareWidth,
          height: squareWidth,
          angle: 45,
          fill: this.color,
        })

        const canvasWidth = rect.getBoundingRect().width

        patternCanvas.width = patternCanvas.height =
          canvasWidth + squareDistance
        rect.set({
          left: canvasWidth / 2,
          top: canvasWidth / 2,
        })

        const ctx = patternCanvas.getContext('2d')!
        rect.render(ctx)

        return patternCanvas
      }
      brushes.diamond = diamondPatternBrush

      // 纹理图案画笔（使用简单的图案代替图片）
      const texturePatternBrush = new fabric.PatternBrush(canvas)
      texturePatternBrush.getPatternSrc = function () {
        const patternCanvas = fabric.getEnv().document.createElement('canvas')
        patternCanvas.width = patternCanvas.height = 20
        const ctx = patternCanvas.getContext('2d')!

        // 创建简单的纹理图案
        ctx.fillStyle = this.color
        for (let i = 0; i < 20; i += 4) {
          for (let j = 0; j < 20; j += 4) {
            if ((i + j) % 8 === 0) {
              ctx.fillRect(i, j, 2, 2)
            }
          }
        }

        return patternCanvas
      }
      brushes.texture = texturePatternBrush
    }

    return brushes
  }, [])

  // 初始化 Fabric.js 画布
  useEffect(() => {
    const { current: canvasEl } = canvasRef
    const { current: canvasWrapperEle } = canvasWrapperRef
    if (canvasEl && canvasWrapperEle) {
      const canvas = new fabric.Canvas(canvasEl, {
        width: canvasWrapperEle.clientWidth,
        height: canvasWrapperEle.clientHeight,
        isDrawingMode: true,
        backgroundColor: '#f8fafc',
      })

      fabricCanvasRef.current = canvas
      console.log(canvas)

      // 初始化画笔
      const brush = new fabric.PencilBrush(canvas)
      canvas.freeDrawingBrush = brush
      fabric.FabricObject.prototype.transparentCorners = false

      // 监听路径创建事件，确保线条宽度正确
      canvas.on('path:created', (e) => {
        const path = e.path
        if (path && canvas.freeDrawingBrush) {
          // 确保路径对象保持正确的strokeWidth
          path.set({
            strokeWidth: canvas.freeDrawingBrush.width,
            stroke: canvas.freeDrawingBrush.color
          })
          canvas.renderAll()
        }
      })

      const resizeObserver = new ResizeObserver(() => {
        canvas.setDimensions({
          width: canvasWrapperEle.clientWidth,
          height: canvasWrapperEle.clientHeight,
        })
      })
      resizeObserver.observe(canvasWrapperEle)

      return () => {
        resizeObserver.unobserve(canvasWrapperEle)
        resizeObserver.disconnect()
        canvas.dispose()
      }
    }
  }, [])

  // 设置选择模式
  const setSelectionMode = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    setIsDrawingMode(false)
    canvas.isDrawingMode = false
  }, [])

  // 设置绘制模式
  const setDrawingMode = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    setIsDrawingMode(true)
    canvas.isDrawingMode = true
  }, [])

  // 更新画笔类型
  const updateBrushType = useCallback(
    (brushType: BrushType) => {
      if (!fabricCanvasRef.current) return

      const canvas = fabricCanvasRef.current
      setSelectedBrush(brushType)

      if (
        brushType === 'hline' ||
        brushType === 'vline' ||
        brushType === 'square' ||
        brushType === 'diamond' ||
        brushType === 'texture'
      ) {
        const patternBrushes = createPatternBrushes(canvas)
        canvas.freeDrawingBrush = patternBrushes[brushType]
      } else {
        // 使用标准画笔
        switch (brushType) {
          case 'Pencil': {
            const brush = new fabric.PencilBrush(canvas)
            canvas.freeDrawingBrush = brush
            break
          }
          case 'Circle':
            canvas.freeDrawingBrush = new fabric.CircleBrush(canvas)
            break
          case 'Spray':
            canvas.freeDrawingBrush = new fabric.SprayBrush(canvas)
            break
          default: {
            const brush = new fabric.PencilBrush(canvas)
            canvas.freeDrawingBrush = brush
          }
        }
      }

      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = drawingColor
        canvas.freeDrawingBrush.width = drawingLineWidth

        // 设置阴影
        if (drawingShadowWidth > 0) {
          canvas.freeDrawingBrush.shadow = new fabric.Shadow({
            blur: drawingShadowWidth,
            offsetX: drawingShadowOffset,
            offsetY: drawingShadowOffset,
            affectStroke: true,
            color: drawingShadowColor,
          })
        } else {
          canvas.freeDrawingBrush.shadow = null
        }
      }
    },
    [
      drawingColor,
      drawingLineWidth,
      drawingShadowWidth,
      drawingShadowOffset,
      drawingShadowColor,
      createPatternBrushes,
    ],
  )

  // 更新画笔属性
  useEffect(() => {
    if (!fabricCanvasRef.current?.freeDrawingBrush) return

    const brush = fabricCanvasRef.current.freeDrawingBrush
    brush.color = drawingColor
    brush.width = drawingLineWidth

    // 设置阴影
    if (drawingShadowWidth > 0) {
      brush.shadow = new fabric.Shadow({
        blur: drawingShadowWidth,
        offsetX: drawingShadowOffset,
        offsetY: drawingShadowOffset,
        affectStroke: true,
        color: drawingShadowColor,
      })
    } else {
      brush.shadow = null
    }
  }, [
    drawingColor,
    drawingLineWidth,
    drawingShadowWidth,
    drawingShadowOffset,
    drawingShadowColor,
  ])

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return

    fabricCanvasRef.current.clear()
  }, [])

  // 导出画布
  const exportCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    })
    const link = document.createElement('a')
    link.download = 'brush-tester.png'
    link.href = dataURL
    link.click()
  }, [])

  return (
    <div className={`flex h-screen w-screen flex-col ${className}`}>
      {/* 工具栏 */}
      <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          {/* 工具选择 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={setSelectionMode}
              className={`rounded-lg p-2 transition-colors ${
                !isDrawingMode
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="选择工具"
            >
              <CursorArrowRaysIcon className="h-5 w-5" />
            </button>
            <button
              onClick={setDrawingMode}
              className={`rounded-lg p-2 transition-colors ${
                isDrawingMode
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="绘制模式"
            >
              <PaintBrushIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 分隔线 */}
          <div className="h-6 w-px bg-gray-300" />

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={clearCanvas}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              title="清空画布"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={exportCanvas}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            导出
          </button>

          {/* 当前模式提示 */}
          <div className="text-sm text-gray-600">
            {isDrawingMode ? `当前画笔: ${selectedBrush}` : '选择模式'}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <div className="w-80 overflow-y-auto border-r border-gray-200 bg-white p-4">
          <div className="space-y-6">
            {/* 画笔选择 */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                画笔类型
              </h3>
              <div className="space-y-2">
                <select
                  value={selectedBrush}
                  onChange={(e) => updateBrushType(e.target.value as BrushType)}
                  disabled={!isDrawingMode}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="Pencil">铅笔画笔</option>
                  <option value="Circle">圆形画笔</option>
                  <option value="Spray">喷雾画笔</option>
                  <option value="hline">水平线图案</option>
                  <option value="vline">垂直线图案</option>
                  <option value="square">方形图案</option>
                  <option value="diamond">菱形图案</option>
                  <option value="texture">纹理图案</option>
                </select>
              </div>
            </div>

            {/* 画笔颜色 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                画笔颜色
              </label>
              <input
                type="color"
                value={drawingColor}
                onChange={(e) => setDrawingColor(e.target.value)}
                disabled={!isDrawingMode}
                className="h-10 w-full cursor-pointer rounded border border-gray-300 disabled:cursor-not-allowed"
              />
            </div>

            {/* 画笔宽度 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                画笔宽度
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={drawingLineWidth}
                onChange={(e) => setDrawingLineWidth(Number(e.target.value))}
                disabled={!isDrawingMode}
                className="w-full disabled:opacity-50"
              />
              <span className="text-sm text-gray-500">
                {drawingLineWidth}px
              </span>
            </div>

            {/* 阴影设置 */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                阴影设置
              </h3>

              {/* 阴影颜色 */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  阴影颜色
                </label>
                <input
                  type="color"
                  value={drawingShadowColor}
                  onChange={(e) => setDrawingShadowColor(e.target.value)}
                  disabled={!isDrawingMode}
                  className="h-10 w-full cursor-pointer rounded border border-gray-300 disabled:cursor-not-allowed"
                />
              </div>

              {/* 阴影模糊 */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  阴影模糊
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={drawingShadowWidth}
                  onChange={(e) =>
                    setDrawingShadowWidth(Number(e.target.value))
                  }
                  disabled={!isDrawingMode}
                  className="w-full disabled:opacity-50"
                />
                <span className="text-sm text-gray-500">
                  {drawingShadowWidth}px
                </span>
              </div>

              {/* 阴影偏移 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  阴影偏移
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={drawingShadowOffset}
                  onChange={(e) =>
                    setDrawingShadowOffset(Number(e.target.value))
                  }
                  disabled={!isDrawingMode}
                  className="w-full disabled:opacity-50"
                />
                <span className="text-sm text-gray-500">
                  {drawingShadowOffset}px
                </span>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="space-y-2 text-sm text-gray-600">
              <h4 className="font-medium text-gray-900">使用说明：</h4>
              <ul className="list-inside list-disc space-y-1">
                <li>选择不同的画笔类型体验不同效果</li>
                <li>调整画笔颜色和宽度</li>
                <li>设置阴影效果增强视觉</li>
                <li>在画布上拖拽绘制</li>
                <li>切换到选择模式可移动绘制内容</li>
                <li>使用清空按钮重新开始</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="mb-2 text-center text-sm text-gray-600">
            {isDrawingMode
              ? '绘制模式：选择画笔类型后在画布上拖拽绘制'
              : '选择模式：可以选择和移动已绘制的内容'}
          </div>
          <div
            ref={canvasWrapperRef}
            className="h-full w-full overflow-hidden rounded-lg bg-white shadow-lg"
          >
            <canvas
              ref={canvasRef}
              className="block h-full w-full"
              style={{ cursor: isDrawingMode ? 'crosshair' : 'default' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrushTester
