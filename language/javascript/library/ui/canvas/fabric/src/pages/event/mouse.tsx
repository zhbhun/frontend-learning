import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function MouseEventTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const addEventLog = (message: string) => {
    setEvents(prev => [message, ...prev.slice(0, 19)])
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f5f5f5'
    })

    fabricCanvasRef.current = canvas

    // 添加测试对象
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 120,
      height: 80,
      fill: '#ff6b6b',
      stroke: '#333',
      strokeWidth: 2,
      rx: 10,
      ry: 10
    })

    const circle = new fabric.Circle({
      left: 300,
      top: 100,
      radius: 60,
      fill: '#4ecdc4',
      stroke: '#333',
      strokeWidth: 2
    })

    const text = new fabric.IText('点击测试文本', {
      left: 500,
      top: 100,
      fontSize: 20,
      fill: '#45b7d1'
    })

    canvas.add(rect, circle, text)

    // 监听鼠标事件
    canvas.on('mouse:down', (e) => {
      const obj = e.target
      const pointer = canvas.getPointer(e.e)
      setMousePosition({ x: Math.round(pointer.x), y: Math.round(pointer.y) })

      if (obj) {
        addEventLog(`鼠标按下: ${obj.type} (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
      } else {
        addEventLog(`鼠标按下: 空白区域 (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
      }
    })

    canvas.on('mouse:move', (e) => {
      const obj = e.target
      const pointer = canvas.getPointer(e.e)
      setMousePosition({ x: Math.round(pointer.x), y: Math.round(pointer.y) })

      if (obj) {
        addEventLog(`鼠标移动: ${obj.type} (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
      }
    })

    canvas.on('mouse:up', (e) => {
      const obj = e.target
      const pointer = canvas.getPointer(e.e)

      if (obj) {
        addEventLog(`鼠标松开: ${obj.type} (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
      } else {
        addEventLog(`鼠标松开: 空白区域 (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
      }
    })

    canvas.on('mouse:over', (e) => {
      const obj = e.target
      if (obj) {
        addEventLog(`鼠标进入: ${obj.type}`)
        obj.set('stroke', '#ff0000')
        obj.set('strokeWidth', 4)
        canvas.renderAll()
      }
    })

    canvas.on('mouse:out', (e) => {
      const obj = e.target
      if (obj) {
        addEventLog(`鼠标离开: ${obj.type}`)
        obj.set('stroke', '#333')
        obj.set('strokeWidth', 2)
        canvas.renderAll()
      }
    })

    canvas.on('mouse:dblclick', (e) => {
      const obj = e.target
      const pointer = canvas.getPointer(e.e)

      if (obj) {
        addEventLog(`鼠标双击: ${obj.type} (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
      } else {
        addEventLog(`鼠标双击: 空白区域 (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
      }
    })

    canvas.on('mouse:wheel', (e) => {
      const pointer = canvas.getPointer(e.e)
      addEventLog(`鼠标滚轮: (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)}) delta: ${e.e.deltaY}`)
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
          height: 60 + Math.random() * 60,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
          rx: Math.random() * 15,
          ry: Math.random() * 15
        })
        break
      case 'circle':
        obj = new fabric.Circle({
          left: Math.random() * 600,
          top: Math.random() * 400,
          radius: 30 + Math.random() * 40,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2
        })
        break
      case 'text':
        obj = new fabric.IText(`文本${Math.floor(Math.random() * 1000)}`, {
          left: Math.random() * 600,
          top: Math.random() * 400,
          fontSize: 16 + Math.random() * 20,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`
        })
        break
    }

    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
    addEventLog(`添加新对象: ${type}`)
  }

  const [mouseMoveEnabled, setMouseMoveEnabled] = useState(true)

  const toggleMouseEvents = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    if (mouseMoveEnabled) {
      canvas.off('mouse:move')
      setMouseMoveEnabled(false)
      addEventLog('禁用鼠标移动事件')
    } else {
      canvas.on('mouse:move', (e) => {
        const obj = e.target
        const pointer = canvas.getPointer(e.e)
        setMousePosition({ x: Math.round(pointer.x), y: Math.round(pointer.y) })

        if (obj) {
          addEventLog(`鼠标移动: ${obj.type} (${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)})`)
        }
      })
      setMouseMoveEnabled(true)
      addEventLog('启用鼠标移动事件')
    }
  }

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.clear()
    canvas.backgroundColor = '#f5f5f5'
    canvas.renderAll()
    addEventLog('清空画布')
  }

  const clearEvents = () => {
    setEvents([])
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white p-6 shadow-lg overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">鼠标事件测试</h1>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">添加对象</h3>
            <div className="space-y-2">
              <button
                onClick={() => addObject('rect')}
                className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
              >
                添加矩形
              </button>
              <button
                onClick={() => addObject('circle')}
                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors"
              >
                添加圆形
              </button>
              <button
                onClick={() => addObject('text')}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
              >
                添加文本
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">事件控制</h3>
            <div className="space-y-2">
              <button
                onClick={toggleMouseEvents}
                className="w-full bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 transition-colors"
              >
                切换鼠标移动事件
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">操作</h3>
            <div className="space-y-2">
              <button
                onClick={clearCanvas}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
              >
                清空画布
              </button>
              <button
                onClick={clearEvents}
                className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors"
              >
                清空事件日志
              </button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">鼠标位置</h3>
            <div className="text-sm text-blue-700">
              <p>X: {mousePosition.x}</p>
              <p>Y: {mousePosition.y}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">使用说明</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• 在画布上移动鼠标</p>
              <p>• 点击对象进行选择</p>
              <p>• 双击对象或空白区域</p>
              <p>• 使用鼠标滚轮</p>
              <p>• 观察右侧事件日志</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <canvas
              ref={canvasRef}
              className="border border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="h-64 bg-white p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">事件日志</h3>
          <div className="bg-gray-50 rounded-lg p-3 h-48 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">暂无事件记录</p>
            ) : (
              <div className="space-y-1">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className="text-sm bg-white p-2 rounded border-l-4 border-red-500"
                  >
                    {event}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
