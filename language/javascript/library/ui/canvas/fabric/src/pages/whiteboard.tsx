import { useRef, useEffect, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  PencilIcon,
  Square2StackIcon,
  CircleStackIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  TrashIcon,
  PhotoIcon,
  CursorArrowRaysIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline'

type ToolType = 'select' | 'draw' | 'rectangle' | 'circle' | 'text' | 'image'

export interface WhiteboardProps {
  className?: string
}

export function Whiteboard({ className = '' }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const currentShapeRef = useRef<fabric.Object | null>(null)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const restoring = useRef(false)
  const [history, setHistory] = useState<{
    stack: string[]
    index: number
  }>({
    stack: [],
    index: -1,
  })
  const [currentTool, setCurrentTool] = useState<ToolType>('select')
  const [brushColor, setBrushColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(2)
  const [fontSize, setFontSize] = useState(20)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [isDrawing, setIsDrawing] = useState(false)
  const [canGroupElements, setCanGroupElements] = useState(false)
  const [canUngroupElements, setCanUngroupElements] = useState(false)

  // 保存画布状态到历史记录
  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current || restoring.current) return

    const canvas = fabricCanvasRef.current
    const json = JSON.stringify(canvas.toJSON())

    setHistory((prev) => {
      // 检查是否与当前状态相同，避免保存重复状态
      if (prev.stack[prev.index] === json) return prev

      const newStack = [...prev.stack.slice(0, prev.index + 1), json]
      // 限制历史记录数量，避免内存占用过大
      if (newStack.length > 50) {
        newStack.shift()
      }
      return {
        stack: newStack,
        index: newStack.length - 1,
      }
    })
  }, [])

  // 撤销功能
  const undo = useCallback(() => {
    if (history.index <= 0) return

    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const newIndex = history.index - 1
    const previousState = history.stack[newIndex]

    if (previousState) {
      restoring.current = true
      canvas
        .loadFromJSON(previousState)
        .then(() => {
          canvas.renderAll()
          setHistory((prev) => ({ ...prev, index: newIndex }))
        })
        .finally(() => {
          restoring.current = false
        })
    }
  }, [history])

  // 重做功能
  const redo = useCallback(() => {
    if (history.index >= history.stack.length - 1) return

    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const newIndex = history.index + 1
    const nextState = history.stack[newIndex]

    if (nextState) {
      restoring.current = true
      canvas
        .loadFromJSON(nextState, () => {})
        .then(() => {
          canvas.renderAll()
          setHistory((prev) => ({ ...prev, index: newIndex }))
        })
        .finally(() => {
          restoring.current = false
        })
    }
  }, [history])

  // 更新组合/分离按钮状态
  const updateGroupButtonsState = useCallback(() => {
    if (fabricCanvasRef.current) {
      const activeObjects = fabricCanvasRef.current.getActiveObjects()
      const activeObject = fabricCanvasRef.current.getActiveObject()

      setCanGroupElements(activeObjects.length > 1)
      setCanUngroupElements(
        Boolean(activeObject && activeObject.type === 'group'),
      )
    }
  }, [])

  // 组合选中对象
  const groupSelected = useCallback(() => {
    if (fabricCanvasRef.current) {
      const activeObjects = fabricCanvasRef.current.getActiveObjects()
      if (activeObjects.length > 1) {
        restoring.current = true
        const group = new fabric.Group(activeObjects, {
          left: 0,
          top: 0,
        })

        // 计算组的边界框
        const groupBounds = group.getBoundingRect()
        group.set({
          left: groupBounds.left,
          top: groupBounds.top,
        })

        // 从画布中移除原始对象
        activeObjects.forEach((obj) => {
          fabricCanvasRef.current?.remove(obj)
        })

        // 添加组合后的组
        fabricCanvasRef.current.add(group)
        fabricCanvasRef.current.setActiveObject(group)
        fabricCanvasRef.current.renderAll()
        updateGroupButtonsState()
        restoring.current = false
        saveState()
      }
    }
  }, [updateGroupButtonsState, saveState])

  // 分离选中的组
  const ungroupSelected = useCallback(() => {
    if (fabricCanvasRef.current) {
      const activeObject = fabricCanvasRef.current.getActiveObject()
      if (activeObject && activeObject.type === 'group') {
        restoring.current = true
        const group = activeObject as fabric.Group
        const items = group.getObjects()

        // 从画布中移除组
        fabricCanvasRef.current.remove(group)

        // 添加组内的所有对象
        items.forEach((item) => {
          fabricCanvasRef.current?.add(item)
        })

        fabricCanvasRef.current.renderAll()
        updateGroupButtonsState()
        restoring.current = false
        saveState()
      }
    }
  }, [updateGroupButtonsState, saveState])

  // 初始化 Fabric.js 画布
  useEffect(() => {
    const { current: canvasEl } = canvasRef
    const { current: canvasWrapperEle } = canvasWrapperRef
    if (canvasEl && canvasWrapperEle) {
      const canvas = new fabric.Canvas(canvasEl, {
        width: canvasWrapperEle.clientWidth,
        height: canvasWrapperEle.clientHeight,
        selection: true,
        preserveObjectStacking: true,
        selectionKey: 'shiftKey', // 按住 Command 键进行多选
        multiSelection: true, // 启用多选
        subTargetCheck: true, // 启用子目标检查，允许选择组内元素
      })

      fabricCanvasRef.current = canvas

      // 初始化画笔
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)

      // 添加画布事件监听器
      canvas.on('object:modified', saveState)
      canvas.on('object:added', saveState)
      canvas.on('object:removed', saveState)
      canvas.on('selection:created', updateGroupButtonsState)
      canvas.on('selection:updated', updateGroupButtonsState)
      canvas.on('selection:cleared', updateGroupButtonsState)

      // 添加组内元素移动事件监听器
      canvas.on('object:moving', (e) => {
        if (e.target && e.target.group) {
          // 如果移动的是组内元素，需要特殊处理
          // 可以在这里添加组内元素移动的特殊处理逻辑
        }
      })

      // 添加鼠标按下事件监听器，处理组内元素选择
      canvas.on('mouse:down', (e) => {
        if (e.e.metaKey && e.target) {
          if (e.target.type === 'group') {
            // 按住 metaKey 键点击组时，选择组内的所有元素
            const group = e.target as fabric.Group
            const groupObjects = group.getObjects()

            // 清除当前选择
            canvas.discardActiveObject()

            // 选择组内的所有元素
            const selection = new fabric.ActiveSelection(groupObjects, {
              canvas: canvas,
            })

            canvas.setActiveObject(selection)
            canvas.renderAll()

            // 阻止默认的组选择行为
            e.e.preventDefault()
            e.e.stopPropagation()
          } else if (e.target.group) {
            // 按住 metaKey 键点击组内元素时，选择该元素
            const currentSelection = canvas.getActiveObject()

            if (
              currentSelection &&
              currentSelection.type === 'activeSelection'
            ) {
              // 如果当前有选择，检查元素是否已经在选择中
              const activeSelection = currentSelection as fabric.ActiveSelection
              const isAlreadySelected = activeSelection
                .getObjects()
                .includes(e.target)

              if (isAlreadySelected) {
                // 如果元素已经被选中，从选择中移除
                activeSelection.remove(e.target)
                if (activeSelection.getObjects().length === 0) {
                  // 如果没有剩余元素，清除选择
                  canvas.discardActiveObject()
                }
              } else {
                // 否则添加到选择中
                activeSelection.add(e.target)
              }
            } else {
              // 否则创建新的选择
              const selection = new fabric.ActiveSelection([e.target], {
                canvas: canvas,
              })
              canvas.setActiveObject(selection)
            }

            canvas.renderAll()

            // 阻止默认的组内元素选择行为
            e.e.preventDefault()
            e.e.stopPropagation()
          }
        }
      })

      const resizeObserver = new ResizeObserver(() => {
        canvas.setDimensions({
          width: canvasWrapperEle.clientWidth,
          height: canvasWrapperEle.clientHeight,
        })
      })
      resizeObserver.observe(canvasWrapperEle)

      // 保存初始状态
      const timer = setTimeout(() => {
        saveState()
        updateGroupButtonsState()
      }, 100)

      return () => {
        clearTimeout(timer)
        canvas.off('object:modified', saveState)
        canvas.off('object:added', saveState)
        canvas.off('object:removed', saveState)
        canvas.off('selection:created', updateGroupButtonsState)
        canvas.off('selection:updated', updateGroupButtonsState)
        canvas.off('selection:cleared', updateGroupButtonsState)
        canvas.off('object:moving')
        canvas.off('mouse:down')
        canvas.dispose()
        resizeObserver.unobserve(canvasWrapperEle)
        resizeObserver.disconnect()
      }
    }
  }, [saveState, updateGroupButtonsState])

  // 更新画笔属性
  useEffect(() => {
    const { current: canvas } = fabricCanvasRef
    if (canvas && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor
      canvas.freeDrawingBrush.width = brushSize
    }
  }, [brushColor, brushSize])

  // 添加图片
  const addImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file && fabricCanvasRef.current) {
        const reader = new FileReader()
        reader.onload = (event) => {
          fabric.FabricImage.fromURL(event.target?.result as string).then(
            (img) => {
              img.scaleToWidth(200)
              fabricCanvasRef.current?.add(img)
              fabricCanvasRef.current?.renderAll()
            },
          )
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }, [])

  // 处理鼠标按下事件
  const handleMouseDown = useCallback(
    (e: fabric.TEvent) => {
      if (
        !fabricCanvasRef.current ||
        currentTool === 'select' ||
        currentTool === 'draw'
      )
        return

      const canvas = fabricCanvasRef.current
      const pointer = canvas.getPointer(e.e)
      startPointRef.current = { x: pointer.x, y: pointer.y }
      setIsDrawing(true)

      if (currentTool === 'text') {
        // 文本工具：直接添加文本
        const text = new fabric.IText('双击编辑文本', {
          left: pointer.x,
          top: pointer.y,
          fontSize,
          fontFamily,
          fill: brushColor,
          selectable: true,
        })
        canvas.add(text)
        canvas.renderAll()
        setCurrentTool('select') // 添加文本后切换到选择工具
      } else if (currentTool === 'image') {
        // 图片工具：触发文件选择
        addImage()
        setCurrentTool('select') // 添加图片后切换到选择工具
      }
    },
    [currentTool, fontSize, fontFamily, brushColor, addImage],
  )

  // 处理鼠标移动事件
  const handleMouseMove = useCallback(
    (e: fabric.TEvent) => {
      if (
        !fabricCanvasRef.current ||
        !isDrawing ||
        !startPointRef.current ||
        currentTool === 'select' ||
        currentTool === 'draw' ||
        currentTool === 'text' ||
        currentTool === 'image'
      )
        return

      const canvas = fabricCanvasRef.current
      const pointer = canvas.getPointer(e.e)

      // 移除之前的临时形状
      if (currentShapeRef.current) {
        canvas.remove(currentShapeRef.current)
      }

      if (currentTool === 'rectangle') {
        const rect = new fabric.Rect({
          left: Math.min(startPointRef.current.x, pointer.x),
          top: Math.min(startPointRef.current.y, pointer.y),
          width: Math.abs(pointer.x - startPointRef.current.x),
          height: Math.abs(pointer.y - startPointRef.current.y),
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
          selectable: false,
        })
        canvas.add(rect)
        currentShapeRef.current = rect
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pointer.x - startPointRef.current.x, 2) +
            Math.pow(pointer.y - startPointRef.current.y, 2),
        )
        const circle = new fabric.Circle({
          left: startPointRef.current.x - radius,
          top: startPointRef.current.y - radius,
          radius,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
          selectable: false,
        })
        canvas.add(circle)
        currentShapeRef.current = circle
      }

      canvas.renderAll()
    },
    [isDrawing, currentTool, brushColor, brushSize],
  )

  // 处理鼠标松开事件
  const handleMouseUp = useCallback(() => {
    if (
      !isDrawing ||
      !currentShapeRef.current ||
      currentTool === 'select' ||
      currentTool === 'draw'
    )
      return

    // 将临时形状设为可选择
    if (currentShapeRef.current) {
      currentShapeRef.current.set('selectable', true)
      fabricCanvasRef.current?.renderAll()
    }

    setIsDrawing(false)
    startPointRef.current = null
    currentShapeRef.current = null
    setCurrentTool('select') // 绘制完成后切换到选择工具
  }, [isDrawing, currentTool])

  // 添加事件监听器
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp])

  // 工具切换
  const handleToolChange = useCallback(
    (tool: ToolType) => {
      setCurrentTool(tool)
      if (fabricCanvasRef.current) {
        const canvas = fabricCanvasRef.current

        switch (tool) {
          case 'select':
            canvas.isDrawingMode = false
            canvas.selection = true
            break
          case 'draw':
            canvas.isDrawingMode = true
            canvas.selection = false
            // 设置画笔属性
            if (canvas.freeDrawingBrush) {
              canvas.freeDrawingBrush.color = brushColor
              canvas.freeDrawingBrush.width = brushSize
            }
            break
          case 'rectangle':
          case 'circle':
          case 'text':
          case 'image':
            canvas.isDrawingMode = false
            canvas.selection = false
            break
        }
      }
    },
    [brushColor, brushSize],
  )

  // 添加矩形
  const addRectangle = useCallback(() => {
    if (fabricCanvasRef.current) {
      const rect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: 'transparent',
        stroke: brushColor,
        strokeWidth: brushSize,
        selectable: true,
        strokeUniform: true,
      })
      fabricCanvasRef.current.add(rect)
      fabricCanvasRef.current.renderAll()
    }
  }, [brushColor, brushSize])

  // 添加圆形
  const addCircle = useCallback(() => {
    if (fabricCanvasRef.current) {
      const circle = new fabric.Circle({
        left: 100,
        top: 100,
        radius: 50,
        fill: 'transparent',
        stroke: brushColor,
        strokeWidth: brushSize,
        selectable: true,
      })
      fabricCanvasRef.current.add(circle)
      fabricCanvasRef.current.renderAll()
    }
  }, [brushColor, brushSize])

  // 添加文本
  const addText = useCallback(() => {
    if (fabricCanvasRef.current) {
      const text = new fabric.IText('双击编辑文本', {
        left: 100,
        top: 100,
        fontSize,
        fontFamily,
        fill: brushColor,
        selectable: true,
      })
      fabricCanvasRef.current.add(text)
      fabricCanvasRef.current.renderAll()
    }
  }, [fontSize, fontFamily, brushColor])

  // 删除选中对象
  const deleteSelected = useCallback(() => {
    if (fabricCanvasRef.current) {
      const activeObjects = fabricCanvasRef.current.getActiveObjects()
      if (activeObjects.length > 0) {
        activeObjects.forEach((obj) => {
          // 如果对象是组内元素，需要从组中移除
          if (obj.group) {
            const group = obj.group
            group.remove(obj)
            // 如果组内没有元素了，从画布中移除组
            if (group.getObjects().length === 0) {
              fabricCanvasRef.current?.remove(group)
            }
          } else {
            // 普通对象直接从画布中移除
            fabricCanvasRef.current?.remove(obj)
          }
        })

        fabricCanvasRef.current.renderAll()
        saveState()
      }
    }
  }, [saveState])

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear()
      fabricCanvasRef.current.renderAll()
    }
  }, [])

  // 导出画布
  const exportCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      })
      const link = document.createElement('a')
      link.download = 'whiteboard.png'
      link.href = dataURL
      link.click()
    }
  }, [])

  return (
    <div className={`flex flex-col w-screen h-screen ${className}`}>
      {/* 工具栏 */}
      <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          {/* 工具选择 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleToolChange('select')}
              className={`rounded-lg p-2 transition-colors ${
                currentTool === 'select'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="选择工具"
            >
              <CursorArrowRaysIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleToolChange('draw')}
              className={`rounded-lg p-2 transition-colors ${
                currentTool === 'draw'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="画笔工具"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleToolChange('rectangle')}
              className={`rounded-lg p-2 transition-colors ${
                currentTool === 'rectangle'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="矩形工具"
            >
              <Square2StackIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleToolChange('circle')}
              className={`rounded-lg p-2 transition-colors ${
                currentTool === 'circle'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="圆形工具"
            >
              <CircleStackIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleToolChange('text')}
              className={`rounded-lg p-2 transition-colors ${
                currentTool === 'text'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="文本工具"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleToolChange('image')}
              className={`rounded-lg p-2 transition-colors ${
                currentTool === 'image'
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="图片工具"
            >
              <PhotoIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 分隔线 */}
          <div className="h-6 w-px bg-gray-300" />

          {/* 颜色选择器 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">颜色:</span>
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-gray-300"
            />
          </div>

          {/* 画笔大小 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">大小:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20"
            />
            <span className="w-8 text-sm text-gray-500">{brushSize}</span>
          </div>

          {/* 字体大小 */}
          {currentTool === 'text' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">字体:</span>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Verdana">Verdana</option>
              </select>
              <input
                type="number"
                min="8"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          )}

          {/* 分隔线 */}
          <div className="h-6 w-px bg-gray-300" />

          {/* 历史记录状态指示器 */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {history.stack.length > 0
                ? `${history.index + 1}/${history.stack.length}`
                : '0/0'}
            </span>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={undo}
              disabled={history.index <= 0}
              className={`rounded-lg p-2 transition-colors ${
                history.index <= 0
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="撤销"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={redo}
              disabled={history.index >= history.stack.length - 1}
              className={`rounded-lg p-2 transition-colors ${
                history.index >= history.stack.length - 1
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="重做"
            >
              <ArrowUturnRightIcon className="h-5 w-5" />
            </button>
            <button
              onClick={groupSelected}
              disabled={!canGroupElements}
              className={`rounded-lg p-2 transition-colors ${
                !canGroupElements
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="组合选中元素"
            >
              <RectangleGroupIcon className="h-5 w-5" />
            </button>
            <button
              onClick={ungroupSelected}
              disabled={!canUngroupElements}
              className={`rounded-lg p-2 transition-colors ${
                !canUngroupElements
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="分离组合"
            >
              <RectangleStackIcon className="h-5 w-5" />
            </button>
            <button
              onClick={deleteSelected}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              title="删除选中"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
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
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="mb-2 text-center text-sm text-gray-600">
          提示：按住 Command/Ctrl
          键点击多个元素进行多选，然后使用组合按钮将它们组合在一起。 按住
          Command/Ctrl
          键点击组可以选择组内的所有元素，再次点击组内元素可以切换选择状态。
        </div>
        <div
          ref={canvasWrapperRef}
          className="h-full w-full overflow-hidden rounded-lg bg-white shadow-lg"
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            style={{ cursor: currentTool === 'draw' ? 'crosshair' : 'default' }}
          />
        </div>
      </div>

      {/* 快捷操作面板 */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={addRectangle}
            className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            添加矩形
          </button>
          <button
            onClick={addCircle}
            className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            添加圆形
          </button>
          <button
            onClick={addText}
            className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            添加文本
          </button>
          <button
            onClick={addImage}
            className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            添加图片
          </button>
        </div>
      </div>
    </div>
  )
}

export default Whiteboard
