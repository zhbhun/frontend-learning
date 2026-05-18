import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function ControlEventTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(
    null,
  )

  const addEventLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f5f5f5',
    })

    fabricCanvasRef.current = canvas

    // 创建测试对象
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 120,
      height: 80,
      fill: '#ff6b6b',
      stroke: '#333',
      strokeWidth: 2,
      rx: 10,
      ry: 10,
    })

    const circle = new fabric.Circle({
      left: 300,
      top: 100,
      radius: 60,
      fill: '#4ecdc4',
      stroke: '#333',
      strokeWidth: 2,
    })

    const triangle = new fabric.Triangle({
      left: 500,
      top: 100,
      width: 80,
      height: 80,
      fill: '#a8e6cf',
      stroke: '#333',
      strokeWidth: 2,
    })

    canvas.add(rect, circle, triangle)

    // 移动事件
    canvas.on('object:moving', (e) => {
      const obj = e.target
      if (obj) {
        const left = Math.round(obj.left || 0)
        const top = Math.round(obj.top || 0)
        addEventLog(`移动中: ${obj.type} (${left}, ${top})`)
      }
    })

    // 缩放事件
    canvas.on('object:scaling', (e) => {
      const obj = e.target
      if (obj) {
        console.log(e)
        const scaleX = Math.round((obj.scaleX || 1) * 100) / 100
        const scaleY = Math.round((obj.scaleY || 1) * 100) / 100
        addEventLog(`缩放中: ${obj.type} ${obj.left} ${obj.top} (${scaleX}, ${scaleY})`)
      }
    })

    // 旋转事件
    canvas.on('object:rotating', (e) => {
      const obj = e.target
      if (obj) {
        const angle = Math.round(obj.angle || 0)
        addEventLog(`旋转中: ${obj.type} (${angle}°)`)
      }
    })

    // 倾斜事件
    canvas.on('object:skewing', (e) => {
      const obj = e.target
      if (obj) {
        const skewX = Math.round((obj.skewX || 0) * 100) / 100
        const skewY = Math.round((obj.skewY || 0) * 100) / 100
        addEventLog(`倾斜中: ${obj.type} (${skewX}, ${skewY})`)
      }
    })

    // 调整大小事件
    canvas.on('object:resizing', (e) => {
      const obj = e.target
      if (obj) {
        let size = ''
        if (obj.type === 'rect' || obj.type === 'triangle') {
          const width = Math.round(obj.width || 0)
          const height = Math.round(obj.height || 0)
          size = `(${width} × ${height})`
        } else if (obj.type === 'circle') {
          const circleObj = obj as fabric.Circle
          const radius = Math.round(circleObj.radius || 0)
          size = `(半径: ${radius})`
        }
        addEventLog(`调整大小中: ${obj.type} ${size}`)
      }
    })

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

  const addObject = (type: 'rect' | 'circle' | 'triangle') => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    let obj: fabric.Object

    switch (type) {
      case 'rect':
        obj = new fabric.Rect({
          left: Math.random() * 600,
          top: Math.random() * 400,
          width: 100 + Math.random() * 80,
          height: 60 + Math.random() * 60,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
          rx: Math.random() * 20,
          ry: Math.random() * 20,
        })
        break
      case 'circle':
        obj = new fabric.Circle({
          left: Math.random() * 600,
          top: Math.random() * 400,
          radius: 40 + Math.random() * 40,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
        })
        break
      case 'triangle':
        obj = new fabric.Triangle({
          left: Math.random() * 600,
          top: Math.random() * 400,
          width: 60 + Math.random() * 60,
          height: 60 + Math.random() * 60,
          fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
          stroke: '#333',
          strokeWidth: 2,
        })
        break
    }

    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
    addEventLog(`添加新对象: ${type}`)
  }

  const toggleObjectControls = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    if (selectedObject.hasControls) {
      selectedObject.set('hasControls', false)
      addEventLog(`隐藏控制点: ${selectedObject.type}`)
    } else {
      selectedObject.set('hasControls', true)
      addEventLog(`显示控制点: ${selectedObject.type}`)
    }
    canvas.renderAll()
  }

  const toggleObjectBorders = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    if (selectedObject.hasBorders) {
      selectedObject.set('hasBorders', false)
      addEventLog(`隐藏边框: ${selectedObject.type}`)
    } else {
      selectedObject.set('hasBorders', true)
      addEventLog(`显示边框: ${selectedObject.type}`)
    }
    canvas.renderAll()
  }

  const lockObject = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    if (selectedObject.selectable) {
      selectedObject.set({
        selectable: false,
        evented: false,
      })
      addEventLog(`锁定对象: ${selectedObject.type}`)
    } else {
      selectedObject.set({
        selectable: true,
        evented: true,
      })
      addEventLog(`解锁对象: ${selectedObject.type}`)
    }
    canvas.renderAll()
  }

  const resetObjectTransform = () => {
    if (!fabricCanvasRef.current || !selectedObject) return

    const canvas = fabricCanvasRef.current
    selectedObject.set({
      left: 100,
      top: 100,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
    })
    canvas.renderAll()
    addEventLog(`重置变换: ${selectedObject.type}`)
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
          对象控制事件测试
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
                onClick={() => addObject('triangle')}
                className="w-full rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                添加三角形
              </button>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-700">
              对象控制
            </h3>
            <div className="space-y-2">
              <button
                onClick={toggleObjectControls}
                disabled={!selectedObject}
                className="w-full rounded bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                切换控制点
              </button>
              <button
                onClick={toggleObjectBorders}
                disabled={!selectedObject}
                className="w-full rounded bg-purple-500 px-4 py-2 text-white transition-colors hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                切换边框
              </button>
              <button
                onClick={lockObject}
                disabled={!selectedObject}
                className="w-full rounded bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                锁定/解锁对象
              </button>
              <button
                onClick={resetObjectTransform}
                disabled={!selectedObject}
                className="w-full rounded bg-teal-500 px-4 py-2 text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                重置变换
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
                <p>
                  位置: ({Math.round(selectedObject.left || 0)},{' '}
                  {Math.round(selectedObject.top || 0)})
                </p>
                <p>
                  缩放: ({Math.round((selectedObject.scaleX || 1) * 100) / 100},{' '}
                  {Math.round((selectedObject.scaleY || 1) * 100) / 100})
                </p>
                <p>旋转: {Math.round(selectedObject.angle || 0)}°</p>
                <p>
                  倾斜: ({Math.round((selectedObject.skewX || 0) * 100) / 100},{' '}
                  {Math.round((selectedObject.skewY || 0) * 100) / 100})
                </p>
                <p>可选择: {selectedObject.selectable ? '是' : '否'}</p>
                <p>可交互: {selectedObject.evented ? '是' : '否'}</p>
                <p>有控制点: {selectedObject.hasControls ? '是' : '否'}</p>
                <p>有边框: {selectedObject.hasBorders ? '是' : '否'}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-green-50 p-4">
            <h3 className="mb-2 text-lg font-semibold text-green-800">
              测试说明
            </h3>
            <div className="space-y-1 text-sm text-green-700">
              <p>• 拖拽对象测试移动事件</p>
              <p>• 拖拽控制点测试缩放事件</p>
              <p>• 拖拽旋转控制点测试旋转事件</p>
              <p>• 拖拽倾斜控制点测试倾斜事件</p>
              <p>• 调整大小控制点测试调整大小事件</p>
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

        <div className="h-64 bg-white p-6 shadow-lg">
          <h3 className="mb-3 text-lg font-semibold text-gray-700">事件日志</h3>
          <div className="h-48 overflow-y-auto rounded-lg bg-gray-50 p-3">
            {/* The events are now logged to the console, so this UI is no longer needed. */}
            <p className="py-8 text-center text-gray-500">
              事件日志已移至控制台
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
