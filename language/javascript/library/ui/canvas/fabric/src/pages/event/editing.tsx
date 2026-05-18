import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function EditingEventTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(
    null,
  )

  const addEventLog = (message: string) => {
    console.log(message)
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f5f5f5',
    })

    fabricCanvasRef.current = canvas

    // 添加测试对象
    const text = new fabric.IText('双击编辑此文本', {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: '#333',
      fontFamily: 'Arial',
    })

    const textbox = new fabric.Textbox('多行文本框\n支持换行', {
      left: 100,
      top: 200,
      fontSize: 18,
      fill: '#666',
      fontFamily: 'Arial',
      width: 200,
    })

    const path = new fabric.Path('M 0 0 L 100 100 L 200 0 Z', {
      left: 100,
      top: 300,
      fill: '#ff6b6b',
      stroke: '#333',
      strokeWidth: 2,
    })

    canvas.add(text, textbox, path)

    // 监听编辑事件
    canvas.on('text:editing:entered', (e) => {
      const obj = e.target
      if (obj) {
        addEventLog(`进入文本编辑模式: ${obj.type}`)
      }
    })

    canvas.on('text:editing:exited', (e) => {
      const obj = e.target
      if (obj) {
        addEventLog(`退出文本编辑模式: ${obj.type}`)
      }
    })

    canvas.on('text:changed', (e) => {
      const obj = e.target
      if (obj) {
        addEventLog(`文本内容变化: ${obj.type}`)
      }
    })

    canvas.on('text:selection:changed', (e) => {
      const obj = e.target
      if (obj) {
        addEventLog(`文本选择变化: ${obj.type}`)
      }
    })

    // 监听选择事件
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0]
      if (obj) {
        addEventLog(`选择创建: ${obj.type}`)
        setSelectedObject(obj)
      }
    })

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0]
      if (obj) {
        addEventLog(`选择更新: ${obj.type}`)
        setSelectedObject(obj)
      }
    })

    return () => {
      canvas.dispose()
    }
  }, [])

  const addText = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const text = new fabric.IText(`新文本${Math.floor(Math.random() * 1000)}`, {
      left: Math.random() * 600,
      top: Math.random() * 400,
      fontSize: 16 + Math.random() * 20,
      fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
      fontFamily: 'Arial',
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
    addEventLog('添加新文本')
  }

  const addTextbox = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const textbox = new fabric.Textbox(
      `多行文本\n第${Math.floor(Math.random() * 1000)}行`,
      {
        left: Math.random() * 600,
        top: Math.random() * 400,
        fontSize: 16 + Math.random() * 20,
        fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
        fontFamily: 'Arial',
        width: 150 + Math.random() * 100,
      },
    )

    canvas.add(textbox)
    canvas.setActiveObject(textbox)
    canvas.renderAll()
    addEventLog('添加新文本框')
  }

  const enterEditMode = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    if (selectedObject.type === 'i-text' || selectedObject.type === 'textbox') {
      ;(selectedObject as fabric.IText).enterEditing()
      addEventLog(`手动进入编辑模式: ${selectedObject.type}`)
    }
  }

  const exitEditMode = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    if (selectedObject.type === 'i-text' || selectedObject.type === 'textbox') {
      ;(selectedObject as fabric.IText).exitEditing()
      addEventLog(`手动退出编辑模式: ${selectedObject.type}`)
    }
  }

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.clear()
    canvas.backgroundColor = '#f5f5f5'
    canvas.renderAll()
    addEventLog('清空画布')
    setSelectedObject(null)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 overflow-y-auto bg-white p-6 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          对象编辑事件测试
        </h1>

        <div className="space-y-4">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              添加对象
            </h3>
            <div className="space-y-2">
              <button
                onClick={addText}
                className="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                添加文本
              </button>
              <button
                onClick={addTextbox}
                className="w-full rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
              >
                添加文本框
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              编辑控制
            </h3>
            <div className="space-y-2">
              <button
                onClick={enterEditMode}
                disabled={
                  !selectedObject ||
                  (selectedObject.type !== 'i-text' &&
                    selectedObject.type !== 'textbox')
                }
                className="w-full rounded bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                进入编辑模式
              </button>
              <button
                onClick={exitEditMode}
                disabled={
                  !selectedObject ||
                  (selectedObject.type !== 'i-text' &&
                    selectedObject.type !== 'textbox')
                }
                className="w-full rounded bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                退出编辑模式
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">操作</h3>
            <div className="space-y-2">
              <button
                onClick={clearCanvas}
                className="w-full rounded bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
              >
                清空画布
              </button>
            </div>
          </div>

          {selectedObject && (
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 text-lg font-semibold text-blue-800">
                选中对象信息
              </h3>
              <div className="space-y-1 text-sm text-blue-700">
                <p>类型: {selectedObject.type}</p>
                <p>可选择: {selectedObject.selectable ? '是' : '否'}</p>
                <p>
                  可编辑:{' '}
                  {selectedObject.type === 'i-text' ||
                  selectedObject.type === 'textbox'
                    ? '是'
                    : '否'}
                </p>
                {selectedObject.type === 'i-text' ||
                selectedObject.type === 'textbox' ? (
                  <p>文本: {(selectedObject as fabric.IText).text}</p>
                ) : null}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 text-lg font-semibold text-gray-700">
              使用说明
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 双击文本对象进入编辑模式</p>
              <p>• 在编辑模式下修改文本内容</p>
              <p>• 点击其他地方退出编辑模式</p>
              <p>• 观察右侧事件日志</p>
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
        z
      </div>
    </div>
  )
}
