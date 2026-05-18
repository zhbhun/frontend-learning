import { useRef, useEffect, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CursorArrowRaysIcon,
  PencilIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

export interface ITextTesterProps {
  className?: string
}

export function ITextTester({ className = '' }: ITextTesterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedIText, setSelectedIText] = useState<fabric.IText | null>(null)
  const [textContent, setTextContent] = useState('双击编辑此文本')
  const [textColor, setTextColor] = useState('#1f2937')
  const [textBgColor, setTextBgColor] = useState('transparent')
  const [fontSize, setFontSize] = useState(20)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontWeight, setFontWeight] = useState('normal')
  const [fontStyle, setFontStyle] = useState('normal')
  const [textAlign, setTextAlign] = useState('left')
  const [textDecoration, setTextDecoration] = useState('')
  const [lineHeight, setLineHeight] = useState(1.16)
  const [charSpacing, setCharSpacing] = useState(0)
  const [textOpacity, setTextOpacity] = useState(1)
  const [textRotation, setTextRotation] = useState(0)
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(0)
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [isTextEditing, setIsTextEditing] = useState(false)

  // 处理选择变化
  const handleSelectionChange = useCallback((e: { selected?: fabric.Object[] }) => {
    const activeObject = e.selected?.[0]
    if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
      const itext = activeObject as fabric.IText
      setSelectedIText(itext)
      // 同步属性面板
      setTextContent(itext.text || '双击编辑此文本')
      setTextColor(typeof itext.fill === 'string' ? itext.fill : '#1f2937')
      setTextBgColor(typeof itext.backgroundColor === 'string' ? itext.backgroundColor : 'transparent')
      setFontSize(itext.fontSize || 20)
      setFontFamily(itext.fontFamily || 'Arial')
      setFontWeight(String(itext.fontWeight || 'normal'))
      setFontStyle(itext.fontStyle || 'normal')
      setTextAlign(itext.textAlign || 'left')
      setTextDecoration(itext.underline ? 'underline' : itext.overline ? 'overline' : itext.linethrough ? 'line-through' : '')
      setLineHeight(itext.lineHeight || 1.16)
      setCharSpacing(itext.charSpacing || 0)
      setTextOpacity(itext.opacity || 1)
      setTextRotation(itext.angle || 0)
      setStrokeColor(typeof itext.stroke === 'string' ? itext.stroke : '#000000')
      setStrokeWidth(itext.strokeWidth || 0)
    }
  }, [])

  // 处理选择清除
  const handleSelectionCleared = useCallback(() => {
    setSelectedIText(null)
  }, [])

  // 处理对象修改
  const handleObjectModified = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll()
    }
  }, [])

  // 处理文本编辑开始
  const handleTextEditingEntered = useCallback(() => {
    setIsTextEditing(true)
  }, [])

  // 处理文本编辑结束
  const handleTextEditingExited = useCallback(() => {
    setIsTextEditing(false)
  }, [])

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
        backgroundColor: '#f8fafc',
        isDrawingMode: false,
      })

      fabricCanvasRef.current = canvas

      // 添加画布事件监听器
      canvas.on('selection:created', handleSelectionChange)
      canvas.on('selection:updated', handleSelectionChange)
      canvas.on('selection:cleared', handleSelectionCleared)
      canvas.on('object:modified', handleObjectModified)
      canvas.on('text:editing:entered', handleTextEditingEntered)
      canvas.on('text:editing:exited', handleTextEditingExited)

      const resizeObserver = new ResizeObserver(() => {
        canvas.setDimensions({
          width: canvasWrapperEle.clientWidth,
          height: canvasWrapperEle.clientHeight,
        })
      })
      resizeObserver.observe(canvasWrapperEle)

      return () => {
        canvas.off('selection:created', handleSelectionChange)
        canvas.off('selection:updated', handleSelectionChange)
        canvas.off('selection:cleared', handleSelectionCleared)
        canvas.off('object:modified', handleObjectModified)
        canvas.off('text:editing:entered', handleTextEditingEntered)
        canvas.off('text:editing:exited', handleTextEditingExited)

        canvas.dispose()
        resizeObserver.unobserve(canvasWrapperEle)
        resizeObserver.disconnect()
      }
    }
  }, [handleSelectionChange, handleSelectionCleared, handleObjectModified, handleTextEditingEntered, handleTextEditingExited])

  // 更新选中文本的属性
  const updateSelectedIText = useCallback((property: string, value: string | number) => {
    if (!selectedIText || !fabricCanvasRef.current) return

    selectedIText.set(property, value)
    fabricCanvasRef.current.renderAll()
  }, [selectedIText])

  // 添加 IText 示例
  const addITextExample = useCallback((type: string) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    let itext: fabric.IText

    switch (type) {
      case 'simple':
        itext = new fabric.IText('双击编辑我！', {
          left: 100,
          top: 100,
          fontSize: 24,
          fill: textColor,
          fontFamily: fontFamily,
          editable: true,
        })
        break

      case 'multiline':
        itext = new fabric.IText('这是一个\n多行文本\n双击可编辑', {
          left: 100,
          top: 200,
          fontSize: 18,
          fill: textColor,
          fontFamily: fontFamily,
          textAlign: 'center',
          editable: true,
        })
        break

      case 'styled':
        itext = new fabric.IText('样式化可编辑文本', {
          left: 300,
          top: 100,
          fontSize: 28,
          fill: '#3b82f6',
          fontFamily: 'Georgia',
          fontWeight: 'bold',
          fontStyle: 'italic',
          underline: true,
          backgroundColor: '#f0f9ff',
          editable: true,
        })
        break

      case 'outlined':
        itext = new fabric.IText('描边可编辑文本', {
          left: 300,
          top: 200,
          fontSize: 32,
          fill: 'transparent',
          stroke: '#ef4444',
          strokeWidth: 2,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          editable: true,
        })
        break

      case 'shadow':
        itext = new fabric.IText('带阴影的可编辑文本', {
          left: 100,
          top: 350,
          fontSize: 24,
          fill: '#1f2937',
          fontFamily: 'Arial',
          fontWeight: 'bold',
          shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.3)',
            blur: 5,
            offsetX: 3,
            offsetY: 3,
          }),
          editable: true,
        })
        break

      case 'rotated':
        itext = new fabric.IText('旋转的可编辑文本', {
          left: 400,
          top: 350,
          fontSize: 20,
          fill: '#10b981',
          fontFamily: 'Arial',
          angle: 45,
          editable: true,
        })
        break

      case 'spaced':
        itext = new fabric.IText('间 距 文 本', {
          left: 100,
          top: 450,
          fontSize: 18,
          fill: '#8b5cf6',
          fontFamily: 'Arial',
          charSpacing: 200,
          editable: true,
        })
        break

      case 'gradient': {
        const gradient = new fabric.Gradient({
          type: 'linear',
          coords: { x1: 0, y1: 0, x2: 200, y2: 0 },
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#ef4444' },
          ],
        })
        itext = new fabric.IText('渐变可编辑文本', {
          left: 300,
          top: 450,
          fontSize: 24,
          fill: gradient,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          editable: true,
        })
        break
      }

      case 'textbox': {
        const textbox = new fabric.Textbox('这是一个文本框，会自动换行。当文本超过指定宽度时，会自动换到下一行。双击可以编辑内容。', {
          left: 500,
          top: 100,
          width: 200,
          fontSize: 16,
          fill: '#1f2937',
          fontFamily: 'Arial',
          editable: true,
        })
        canvas.add(textbox)
        canvas.setActiveObject(textbox)
        canvas.renderAll()
        return
      }

      default:
        return
    }

    canvas.add(itext)
    canvas.setActiveObject(itext)
    canvas.renderAll()
  }, [textColor, fontFamily])

  // 添加自定义 IText
  const addCustomIText = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const itext = new fabric.IText(textContent, {
      left: 100 + Math.random() * 200,
      top: 100 + Math.random() * 200,
      fontSize: fontSize,
      fill: textColor,
      backgroundColor: textBgColor === 'transparent' ? '' : textBgColor,
      fontFamily: fontFamily,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      textAlign: textAlign,
      underline: textDecoration === 'underline',
      overline: textDecoration === 'overline',
      linethrough: textDecoration === 'line-through',
      lineHeight: lineHeight,
      charSpacing: charSpacing,
      opacity: textOpacity,
      angle: textRotation,
      stroke: strokeWidth > 0 ? strokeColor : '',
      strokeWidth: strokeWidth,
      editable: true,
    })

    canvas.add(itext)
    canvas.setActiveObject(itext)
    canvas.renderAll()
  }, [
    textContent, fontSize, textColor, textBgColor, fontFamily, fontWeight,
    fontStyle, textAlign, textDecoration, lineHeight, charSpacing,
    textOpacity, textRotation, strokeColor, strokeWidth
  ])

  // 切换编辑模式
  const toggleEditingMode = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const newMode = !isEditingMode
    setIsEditingMode(newMode)

    if (newMode) {
      // 启用编辑模式
      fabricCanvasRef.current.defaultCursor = 'text'
    } else {
      // 禁用编辑模式
      fabricCanvasRef.current.defaultCursor = 'default'
    }
  }, [isEditingMode])

  // 进入编辑模式
  const enterTextEditMode = useCallback(() => {
    if (selectedIText && fabricCanvasRef.current) {
      selectedIText.enterEditing()
      selectedIText.selectAll()
      fabricCanvasRef.current.renderAll()
    }
  }, [selectedIText])

  // 退出编辑模式
  const exitTextEditMode = useCallback(() => {
    if (selectedIText && fabricCanvasRef.current) {
      selectedIText.exitEditing()
      fabricCanvasRef.current.renderAll()
    }
  }, [selectedIText])

  // 删除选中的文本
  const deleteSelectedIText = useCallback(() => {
    if (!selectedIText || !fabricCanvasRef.current) return

    fabricCanvasRef.current.remove(selectedIText)
    setSelectedIText(null)
    fabricCanvasRef.current.renderAll()
  }, [selectedIText])

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return

    fabricCanvasRef.current.clear()
    setSelectedIText(null)
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
    link.download = 'itext-tester.png'
    link.href = dataURL
    link.click()
  }, [])

  return (
    <div className={`flex flex-col w-screen h-screen ${className}`}>
      {/* 工具栏 */}
      <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          {/* 工具选择 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (fabricCanvasRef.current && isEditingMode) {
                  fabricCanvasRef.current.defaultCursor = 'default'
                  setIsEditingMode(false)
                }
              }}
              className={`rounded-lg p-2 transition-colors ${
                !isEditingMode
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="选择工具"
            >
              <CursorArrowRaysIcon className="h-5 w-5" />
            </button>
            <button
              onClick={toggleEditingMode}
              className={`rounded-lg p-2 transition-colors ${
                isEditingMode
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`}
              title="文本编辑模式"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 分隔线 */}
          <div className="h-6 w-px bg-gray-300" />

          {/* 编辑操作 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={enterTextEditMode}
              disabled={!selectedIText || isTextEditing}
              className={`rounded-lg p-2 transition-colors ${
                !selectedIText || isTextEditing
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="进入编辑模式"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={exitTextEditMode}
              disabled={!selectedIText || !isTextEditing}
              className={`rounded-lg p-2 transition-colors ${
                !selectedIText || !isTextEditing
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="退出编辑模式"
            >
              <DocumentTextIcon className="h-5 w-5" />
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
            <button
              onClick={deleteSelectedIText}
              disabled={!selectedIText}
              className={`rounded-lg p-2 transition-colors ${
                !selectedIText
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="删除选中文本"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={exportCanvas}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            导出
          </button>

          {/* 状态指示器 */}
          {isTextEditing && (
            <div className="flex items-center space-x-2 rounded-lg bg-green-100 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-green-700">编辑中</span>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <div className="w-80 border-r border-gray-200 bg-white p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* IText 示例 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">可编辑文本示例</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addITextExample('simple')}
                  className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-200"
                >
                  简单文本
                </button>
                <button
                  onClick={() => addITextExample('multiline')}
                  className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700 transition-colors hover:bg-green-200"
                >
                  多行文本
                </button>
                <button
                  onClick={() => addITextExample('styled')}
                  className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-700 transition-colors hover:bg-yellow-200"
                >
                  样式文本
                </button>
                <button
                  onClick={() => addITextExample('outlined')}
                  className="rounded-lg bg-purple-100 px-3 py-2 text-sm text-purple-700 transition-colors hover:bg-purple-200"
                >
                  描边文本
                </button>
                <button
                  onClick={() => addITextExample('shadow')}
                  className="rounded-lg bg-indigo-100 px-3 py-2 text-sm text-indigo-700 transition-colors hover:bg-indigo-200"
                >
                  阴影文本
                </button>
                <button
                  onClick={() => addITextExample('rotated')}
                  className="rounded-lg bg-pink-100 px-3 py-2 text-sm text-pink-700 transition-colors hover:bg-pink-200"
                >
                  旋转文本
                </button>
                <button
                  onClick={() => addITextExample('spaced')}
                  className="rounded-lg bg-cyan-100 px-3 py-2 text-sm text-cyan-700 transition-colors hover:bg-cyan-200"
                >
                  间距文本
                </button>
                <button
                  onClick={() => addITextExample('gradient')}
                  className="rounded-lg bg-orange-100 px-3 py-2 text-sm text-orange-700 transition-colors hover:bg-orange-200"
                >
                  渐变文本
                </button>
                <button
                  onClick={() => addITextExample('textbox')}
                  className="col-span-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-200"
                >
                  文本框 (自动换行)
                </button>
              </div>
            </div>

            {/* 自定义文本 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">自定义可编辑文本</h3>
              <button
                onClick={addCustomIText}
                className="w-full rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
              >
                <PlusIcon className="h-4 w-4 inline mr-2" />
                添加自定义文本
              </button>
            </div>

            {/* 文本属性控制 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">文本属性</h3>
              <div className="space-y-4">
                {/* 文本内容 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    文本内容
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => {
                      setTextContent(e.target.value)
                      if (selectedIText) {
                        updateSelectedIText('text', e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                    placeholder="双击编辑此文本"
                  />
                </div>

                {/* 字体大小 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    字体大小
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="100"
                    value={fontSize}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setFontSize(value)
                      if (selectedIText) {
                        updateSelectedIText('fontSize', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{fontSize}px</span>
                </div>

                {/* 字体 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    字体
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => {
                      setFontFamily(e.target.value)
                      if (selectedIText) {
                        updateSelectedIText('fontFamily', e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Impact">Impact</option>
                  </select>
                </div>

                {/* 字体粗细 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    字体粗细
                  </label>
                  <select
                    value={fontWeight}
                    onChange={(e) => {
                      setFontWeight(e.target.value)
                      if (selectedIText) {
                        updateSelectedIText('fontWeight', e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                    <option value="600">600</option>
                    <option value="700">700</option>
                    <option value="800">800</option>
                    <option value="900">900</option>
                  </select>
                </div>

                {/* 字体样式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    字体样式
                  </label>
                  <select
                    value={fontStyle}
                    onChange={(e) => {
                      setFontStyle(e.target.value)
                      if (selectedIText) {
                        updateSelectedIText('fontStyle', e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="italic">Italic</option>
                    <option value="oblique">Oblique</option>
                  </select>
                </div>

                {/* 文本对齐 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    文本对齐
                  </label>
                  <select
                    value={textAlign}
                    onChange={(e) => {
                      setTextAlign(e.target.value)
                      if (selectedIText) {
                        updateSelectedIText('textAlign', e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>

                {/* 文本装饰 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    文本装饰
                  </label>
                  <select
                    value={textDecoration}
                    onChange={(e) => {
                      setTextDecoration(e.target.value)
                      if (selectedIText) {
                        selectedIText.set('underline', e.target.value === 'underline')
                        selectedIText.set('overline', e.target.value === 'overline')
                        selectedIText.set('linethrough', e.target.value === 'line-through')
                        fabricCanvasRef.current?.renderAll()
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">None</option>
                    <option value="underline">Underline</option>
                    <option value="overline">Overline</option>
                    <option value="line-through">Line Through</option>
                  </select>
                </div>

                {/* 文本颜色 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    文本颜色
                  </label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value)
                      if (selectedIText) {
                        updateSelectedIText('fill', e.target.value)
                      }
                    }}
                    className="h-10 w-full cursor-pointer rounded border border-gray-300"
                  />
                </div>

                {/* 背景颜色 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    背景颜色
                  </label>
                  <input
                    type="color"
                    value={textBgColor === 'transparent' ? '#ffffff' : textBgColor}
                    onChange={(e) => {
                      setTextBgColor(e.target.value)
                      if (selectedIText) {
                        updateSelectedIText('backgroundColor', e.target.value)
                      }
                    }}
                    className="h-10 w-full cursor-pointer rounded border border-gray-300"
                  />
                  <button
                    onClick={() => {
                      setTextBgColor('transparent')
                      if (selectedIText) {
                        updateSelectedIText('backgroundColor', '')
                      }
                    }}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    设为透明
                  </button>
                </div>

                {/* 描边颜色 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描边颜色
                  </label>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => {
                      setStrokeColor(e.target.value)
                      if (selectedIText && strokeWidth > 0) {
                        updateSelectedIText('stroke', e.target.value)
                      }
                    }}
                    className="h-10 w-full cursor-pointer rounded border border-gray-300"
                  />
                </div>

                {/* 描边宽度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描边宽度
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={strokeWidth}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setStrokeWidth(value)
                      if (selectedIText) {
                        updateSelectedIText('strokeWidth', value)
                        updateSelectedIText('stroke', value > 0 ? strokeColor : '')
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{strokeWidth}px</span>
                </div>

                {/* 行高 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    行高
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setLineHeight(value)
                      if (selectedIText) {
                        updateSelectedIText('lineHeight', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{lineHeight}</span>
                </div>

                {/* 字符间距 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    字符间距
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={charSpacing}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setCharSpacing(value)
                      if (selectedIText) {
                        updateSelectedIText('charSpacing', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{charSpacing}</span>
                </div>

                {/* 透明度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    透明度
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={textOpacity}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setTextOpacity(value)
                      if (selectedIText) {
                        updateSelectedIText('opacity', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{textOpacity}</span>
                </div>

                {/* 旋转角度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    旋转角度
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={textRotation}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      setTextRotation(value)
                      if (selectedIText) {
                        updateSelectedIText('angle', value)
                      }
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{textRotation}°</span>
                </div>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="text-sm text-gray-600 space-y-2">
              <h4 className="font-medium text-gray-900">使用说明：</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>点击文本示例按钮添加预定义可编辑文本</li>
                <li>双击文本即可直接编辑内容</li>
                <li>选择文本后可在左侧面板调整属性</li>
                <li>拖拽文本可改变位置</li>
                <li>拖拽控制点可调整大小</li>
                <li>编辑模式下支持键盘快捷键操作</li>
                <li>支持多行文本编辑和自动换行文本框</li>
                <li>编辑时可使用 Ctrl+A 全选，Enter 换行</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="mb-2 text-center text-sm text-gray-600">
            {isEditingMode ? '编辑模式：点击画布添加文本' : '选择模式：点击选择文本，双击编辑内容'}
            {isTextEditing && <span className="ml-2 text-green-600">• 正在编辑文本</span>}
          </div>
          <div
            ref={canvasWrapperRef}
            className="h-full w-full overflow-hidden rounded-lg bg-white shadow-lg"
          >
            <canvas
              ref={canvasRef}
              className="block h-full w-full"
              style={{ cursor: isEditingMode ? 'text' : 'default' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ITextTester
