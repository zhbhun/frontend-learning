import { useRef, useEffect, useState, useCallback } from 'react'
import * as fabric from 'fabric'
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export interface TextboxTesterProps {
  className?: string
}

export function TextboxTester({ className = '' }: TextboxTesterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedTextbox, setSelectedTextbox] = useState<fabric.Textbox | null>(null)

  // 初始化画布
  useEffect(() => {
    const { current: canvasEl } = canvasRef
    const { current: canvasWrapperEle } = canvasWrapperRef
    if (canvasEl && canvasWrapperEle) {
      const canvas = new fabric.Canvas(canvasEl, {
        width: canvasWrapperEle.clientWidth,
        height: canvasWrapperEle.clientHeight,
        backgroundColor: '#f8fafc',
      })

      fabricCanvasRef.current = canvas

      canvas.on('selection:created', (e) => {
        const activeObject = e.selected?.[0]
        if (activeObject && activeObject.type === 'textbox') {
          setSelectedTextbox(activeObject as fabric.Textbox)
        }
      })

      canvas.on('selection:cleared', () => {
        setSelectedTextbox(null)
      })

      return () => {
        canvas.dispose()
      }
    }
  }, [])

  // 添加基础文本框
  const addBasicTextbox = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const textbox = new fabric.Textbox('这是一个文本框示例，当文本超过宽度时会自动换行。', {
      left: 50,
      top: 50,
      width: 200,
      fontSize: 16,
      fill: '#1f2937',
      editable: true,
    })

    fabricCanvasRef.current.add(textbox)
    fabricCanvasRef.current.setActiveObject(textbox)
    fabricCanvasRef.current.renderAll()
  }, [])

  // 添加固定宽度文本框
  const addFixedWidthTextbox = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const textbox = new fabric.Textbox('固定宽度150px的文本框，内容会根据宽度自动换行。', {
      left: 300,
      top: 50,
      width: 150,
      fontSize: 14,
      fill: '#3b82f6',
      backgroundColor: '#f0f9ff',
      textAlign: 'center',
      editable: true,
    })

    fabricCanvasRef.current.add(textbox)
    fabricCanvasRef.current.setActiveObject(textbox)
    fabricCanvasRef.current.renderAll()
  }, [])

  // 添加窄文本框
  const addNarrowTextbox = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const textbox = new fabric.Textbox('窄文本框测试换行效果', {
      left: 50,
      top: 200,
      width: 80,
      fontSize: 12,
      fill: '#dc2626',
      editable: true,
    })

    fabricCanvasRef.current.add(textbox)
    fabricCanvasRef.current.setActiveObject(textbox)
    fabricCanvasRef.current.renderAll()
  }, [])

  // 添加中文字符分割文本框
  const addGraphemeTextbox = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const textbox = new fabric.Textbox('中文字符分割测试：这是一个很长的中文句子，测试按字符换行的效果。', {
      left: 200,
      top: 200,
      width: 120,
      fontSize: 14,
      fill: '#8b5cf6',
      splitByGrapheme: true,
      editable: true,
    })

    fabricCanvasRef.current.add(textbox)
    fabricCanvasRef.current.setActiveObject(textbox)
    fabricCanvasRef.current.renderAll()
  }, [])

  // 删除选中文本框
  const deleteSelected = useCallback(() => {
    if (selectedTextbox && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(selectedTextbox)
      setSelectedTextbox(null)
      fabricCanvasRef.current.renderAll()
    }
  }, [selectedTextbox])

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear()
      setSelectedTextbox(null)
    }
  }, [])

  return (
    <div className={`flex flex-col w-screen h-screen ${className}`}>
      {/* 工具栏 */}
      <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900">Textbox 测试</h1>

          <div className="flex items-center space-x-2">
            <button
              onClick={addBasicTextbox}
              className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-700 hover:bg-blue-200"
            >
              基础文本框
            </button>
            <button
              onClick={addFixedWidthTextbox}
              className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700 hover:bg-green-200"
            >
              固定宽度
            </button>
            <button
              onClick={addNarrowTextbox}
              className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200"
            >
              窄文本框
            </button>
            <button
              onClick={addGraphemeTextbox}
              className="rounded-lg bg-purple-100 px-3 py-2 text-sm text-purple-700 hover:bg-purple-200"
            >
              中文分割
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex items-center space-x-2">
            <button
              onClick={deleteSelected}
              disabled={!selectedTextbox}
              className={`rounded-lg p-2 transition-colors ${
                !selectedTextbox
                  ? 'cursor-not-allowed text-gray-400'
                  : 'hover:bg-gray-100'
              }`}
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
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="mb-2 text-center text-sm text-gray-600">
          双击文本框可编辑内容，拖拽可移动位置和调整大小
        </div>
        <div
          ref={canvasWrapperRef}
          className="h-full w-full overflow-hidden rounded-lg bg-white shadow-lg"
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
          />
        </div>
      </div>

      {/* 说明面板 */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-600">
          <h4 className="font-medium text-gray-900 mb-2">Textbox 特性说明：</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>基础文本框</strong>：宽度200px，文本会自动换行</li>
            <li><strong>固定宽度</strong>：宽度150px，居中对齐，带背景色</li>
            <li><strong>窄文本框</strong>：宽度80px，观察频繁换行效果</li>
            <li><strong>中文分割</strong>：使用 splitByGrapheme，按字符而非单词换行</li>
            <li>所有文本框都支持双击编辑、拖拽移动、调整大小</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TextboxTester
