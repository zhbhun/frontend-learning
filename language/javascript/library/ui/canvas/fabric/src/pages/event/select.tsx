import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function SelectEventTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([])
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('single')

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
    const rect1 = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 80,
      fill: '#ff6b6b',
      stroke: '#333',
      strokeWidth: 2,
      rx: 10,
      ry: 10
    })

    const rect2 = new fabric.Rect({
      left: 250,
      top: 100,
      width: 100,
      height: 80,
      fill: '#4ecdc4',
      stroke: '#333',
      strokeWidth: 2,
      rx: 10,
      ry: 10
    })

    const circle = new fabric.Circle({
      left: 400,
      top: 100,
      radius: 50,
      fill: '#45b7d1',
      stroke: '#333',
      strokeWidth: 2
    })

    const text = new fabric.IText('选择测试文本', {
      left: 550,
      top: 100,
      fontSize: 18,
      fill: '#333'
    })

    canvas.add(rect1, rect2, circle, text)

    // 监听选择事件
    canvas.on('selection:created', (e) => {
      const objects = e.selected || []
      setSelectedObjects(objects)
      addEventLog(`选择创建: ${objects.length} 个对象`)
      objects.forEach((obj, index) => {
        addEventLog(`  - 对象${index + 1}: ${obj.type}`)
      })
    })

    canvas.on('selection:updated', (e) => {
      const objects = e.selected || []
      setSelectedObjects(objects)
      addEventLog(`选择更新: ${objects.length} 个对象`)
      objects.forEach((obj, index) => {
        addEventLog(`  - 对象${index + 1}: ${obj.type}`)
      })
    })

    canvas.on('selection:cleared', () => {
      setSelectedObjects([])
      addEventLog('选择清除')
    })

    canvas.on('before:selection:cleared', () => {
      addEventLog('即将清除选择')
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

  const toggleSelectionMode = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    if (selectionMode === 'single') {
      setSelectionMode('multiple')
      canvas.selection = true
      canvas.setMultipleSelection(true)
      addEventLog('切换到多选模式')
    } else {
      setSelectionMode('single')
      canvas.selection = false
      addEventLog('切换到单选模式')
    }
  }

  const selectAll = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects()
    if (objects.length > 0) {
      canvas.discardActiveObject()
      const selection = new fabric.ActiveSelection(objects, { canvas })
      canvas.setActiveObject(selection)
      canvas.renderAll()
      addEventLog(`全选所有对象: ${objects.length} 个`)
    }
  }

  const deselectAll = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.discardActiveObject()
    canvas.renderAll()
    addEventLog('取消所有选择')
  }

  const selectByType = (type: string) => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const objects = canvas.getObjects().filter(obj => obj.type === type)
    if (objects.length > 0) {
      canvas.discardActiveObject()
      const selection = new fabric.ActiveSelection(objects, { canvas })
      canvas.setActiveObject(selection)
      canvas.renderAll()
      addEventLog(`选择所有 ${type} 类型对象: ${objects.length} 个`)
    } else {
      addEventLog(`没有找到 ${type} 类型的对象`)
    }
  }

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.clear()
    canvas.backgroundColor = '#f5f5f5'
    canvas.renderAll()
    addEventLog('清空画布')
    setSelectedObjects([])
  }

  const clearEvents = () => {
    setEvents([])
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white p-6 shadow-lg overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">选择事件测试</h1>

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
            <h3 className="text-lg font-semibold mb-3 text-gray-700">选择控制</h3>
            <div className="space-y-2">
              <button
                onClick={toggleSelectionMode}
                className="w-full bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 transition-colors"
              >
                当前模式: {selectionMode === 'single' ? '单选' : '多选'}
              </button>
              <button
                onClick={selectAll}
                className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors"
              >
                全选所有对象
              </button>
              <button
                onClick={deselectAll}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors"
              >
                取消所有选择
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">按类型选择</h3>
            <div className="space-y-2">
              <button
                onClick={() => selectByType('rect')}
                className="w-full bg-red-400 text-white py-2 px-4 rounded hover:bg-red-500 transition-colors"
              >
                选择所有矩形
              </button>
              <button
                onClick={() => selectByType('circle')}
                className="w-full bg-green-400 text-white py-2 px-4 rounded hover:bg-green-500 transition-colors"
              >
                选择所有圆形
              </button>
              <button
                onClick={() => selectByType('i-text')}
                className="w-full bg-blue-400 text-white py-2 px-4 rounded hover:bg-blue-500 transition-colors"
              >
                选择所有文本
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
                className="w-full bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600 transition-colors"
              >
                清空事件日志
              </button>
            </div>
          </div>

          {selectedObjects.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-green-800">选中对象信息</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>选中数量: {selectedObjects.length}</p>
                {selectedObjects.map((obj, index) => (
                  <p key={index}>
                    对象{index + 1}: {obj.type} ({obj.left?.toFixed(0)}, {obj.top?.toFixed(0)})
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">使用说明</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• 点击对象进行选择</p>
              <p>• 按住 Shift 键进行多选</p>
              <p>• 使用按钮进行批量选择</p>
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
                    className="text-sm bg-white p-2 rounded border-l-4 border-green-500"
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
