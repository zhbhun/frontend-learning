import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function ModifyEventTester() {
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
    console.log('>>', canvas)

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#ff6b6b',
      stroke: '#333',
      strokeWidth: 2,
    })

    const circle = new fabric.Circle({
      left: 300,
      top: 100,
      radius: 50,
      fill: '#4ecdc4',
      stroke: '#333',
      strokeWidth: 2,
    })

    const text = new fabric.IText('可编辑文本', {
      left: 500,
      top: 100,
      fontSize: 20,
      fill: '#45b7d1',
    })

    canvas.add(rect, circle, text)

    canvas.on('object:modified', (e) => {
      const obj = e.target
      if (obj) {
        addEventLog(
          `对象修改: ${obj.type} (${obj.left?.toFixed(0)}, ${obj.top?.toFixed(0)})`,
        )
        setSelectedObject(obj)
      }
    })

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

  const addObject = (type: 'rect' | 'circle' | 'text') => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    let obj: fabric.Object

    switch (type) {
      case 'rect':
        obj = new fabric.Rect({
          left: Math.random() * 600,
          top: Math.random() * 400,
          width: 80 + Math.random() * 60,
          height: 80 + Math.random() * 60,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
        })
        break
      case 'circle':
        obj = new fabric.Circle({
          left: Math.random() * 600,
          top: Math.random() * 400,
          radius: 40 + Math.random() * 30,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
        })
        break
      case 'text':
        obj = new fabric.IText(`文本${Math.floor(Math.random() * 1000)}`, {
          left: Math.random() * 600,
          top: Math.random() * 400,
          fontSize: 16 + Math.random() * 20,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
        })
        break
    }

    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
    addEventLog(`添加新对象: ${type}`)
  }

  const deleteSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    canvas.remove(selectedObject)
    canvas.renderAll()
    addEventLog(`删除对象: ${selectedObject.type}`)
    setSelectedObject(null)
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
          对象变化事件测试
        </h1>

        <div className="space-y-4">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              添加对象
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => addObject('rect')}
                className="w-full rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
              >
                添加矩形
              </button>
              <button
                onClick={() => addObject('circle')}
                className="w-full rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
              >
                添加圆形
              </button>
              <button
                onClick={() => addObject('text')}
                className="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                添加文本
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">操作</h3>
            <div className="space-y-2">
              <button
                onClick={deleteSelected}
                disabled={!selectedObject}
                className="w-full rounded bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                删除选中对象
              </button>
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
                <p>
                  位置: ({selectedObject.left?.toFixed(0)},{' '}
                  {selectedObject.top?.toFixed(0)})
                </p>
                <p>
                  尺寸: {selectedObject.width?.toFixed(0)} ×{' '}
                  {selectedObject.height?.toFixed(0)}
                </p>
                <p>
                  缩放: {selectedObject.scaleX?.toFixed(2)} ×{' '}
                  {selectedObject.scaleY?.toFixed(2)}
                </p>
                <p>旋转: {selectedObject.angle?.toFixed(1)}°</p>
              </div>
            </div>
          )}
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
