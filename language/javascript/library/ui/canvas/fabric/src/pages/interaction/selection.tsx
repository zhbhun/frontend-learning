import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

export function SelectionTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([])
  const [selectionMode, setSelectionMode] = useState<'single' | 'area' | 'multi'>('single')
  const selectionModeRef = useRef(selectionMode)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8fafc',
      selection: false,
      selectionBorderColor: '#3b82f6',
      selectionColor: 'rgba(59, 130, 246, 0.1)',
      selectionLineDashArray: [5, 5],
      selectionLineWidth: 2,
    })

    fabricCanvasRef.current = canvas
    console.log(canvas)

    // 添加测试对象
    const objects = [
      new fabric.Rect({
        left: 50,
        top: 50,
        width: 80,
        height: 60,
        fill: '#ef4444',
        stroke: '#dc2626',
        strokeWidth: 2,
        rx: 5,
        ry: 5
      }),
      new fabric.Rect({
        left: 180,
        top: 50,
        width: 100,
        height: 80,
        fill: '#22c55e',
        stroke: '#16a34a',
        strokeWidth: 2,
        rx: 8,
        ry: 8
      }),
      new fabric.Circle({
        left: 350,
        top: 50,
        radius: 40,
        fill: '#3b82f6',
        stroke: '#2563eb',
        strokeWidth: 2
      }),
      new fabric.Triangle({
        left: 500,
        top: 50,
        width: 80,
        height: 80,
        fill: '#f59e0b',
        stroke: '#d97706',
        strokeWidth: 2
      }),
      new fabric.Rect({
        left: 50,
        top: 180,
        width: 120,
        height: 60,
        fill: '#8b5cf6',
        stroke: '#7c3aed',
        strokeWidth: 2,
        rx: 10,
        ry: 10
      }),
      new fabric.Circle({
        left: 220,
        top: 180,
        radius: 35,
        fill: '#ec4899',
        stroke: '#db2777',
        strokeWidth: 2
      }),
      new fabric.IText('选择测试文本', {
        left: 320,
        top: 200,
        fontSize: 20,
        fill: '#374151',
        fontFamily: 'Arial'
      }),
      new fabric.Rect({
        left: 50,
        top: 320,
        width: 90,
        height: 90,
        fill: '#06b6d4',
        stroke: '#0891b2',
        strokeWidth: 2,
        rx: 12,
        ry: 12
      }),
      new fabric.Circle({
        left: 200,
        top: 320,
        radius: 45,
        fill: '#84cc16',
        stroke: '#65a30d',
        strokeWidth: 2
      }),
      new fabric.Triangle({
        left: 350,
        top: 320,
        width: 70,
        height: 70,
        fill: '#f97316',
        stroke: '#ea580c',
        strokeWidth: 2
      }),
      new fabric.Rect({
        left: 480,
        top: 320,
        width: 110,
        height: 70,
        fill: '#a855f7',
        stroke: '#9333ea',
        strokeWidth: 2,
        rx: 6,
        ry: 6
      }),
    ]

    canvas.add(...objects)

    // 监听选择事件
    canvas.on('selection:created', (e) => {
      const objects = e.selected || []
      setSelectedObjects(objects)
      console.log(`✅ 选择创建: ${objects.length} 个对象`)
      objects.forEach((obj, index) => {
        console.log(`   • 对象${index + 1}: ${obj.type} (${obj.left?.toFixed(0)}, ${obj.top?.toFixed(0)})`)
      })
    })

    canvas.on('selection:updated', (e) => {
      const objects = e.selected || []
      setSelectedObjects(objects)
      console.log(`🔄 选择更新: ${objects.length} 个对象`)
      objects.forEach((obj, index) => {
        console.log(`   • 对象${index + 1}: ${obj.type} (${obj.left?.toFixed(0)}, ${obj.top?.toFixed(0)})`)
      })
    })

    canvas.on('selection:cleared', () => {
      setSelectedObjects([])
      console.log('❌ 选择清除')
    })

    canvas.on('before:selection:cleared', () => {
      console.log('⚠️ 即将清除选择')
    })

    return () => {
      canvas.dispose()
    }
  }, [])

  // 更新 ref 值
  useEffect(() => {
    selectionModeRef.current = selectionMode
  }, [selectionMode])

  // 切换选择模式
  const switchSelectionMode = (mode: 'single' | 'area' | 'multi') => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    setSelectionMode(mode)

    switch (mode) {
      case 'single':
        canvas.selection = false
        canvas.selectionKey = null
        canvas.uniformScaling = true
        console.log('🔄 切换到单选模式')
        break
      case 'area':
        canvas.selection = true
        canvas.selectionKey = null
        canvas.uniformScaling = true
        console.log('🔄 切换到区域选择模式')
        break
      case 'multi':
        canvas.selection = true
        canvas.selectionKey = ['shiftKey']
        canvas.uniformScaling = false
        console.log('🔄 切换到多选模式 (按住 Shift)')
        break
    }

    // 清除当前选择
    canvas.discardActiveObject()
    canvas.renderAll()
  }

  const addTestObject = (type: 'rect' | 'circle' | 'triangle' | 'text') => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    let obj: fabric.Object

    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    const color = colors[Math.floor(Math.random() * colors.length)]

    switch (type) {
      case 'rect':
        obj = new fabric.Rect({
          left: Math.random() * 600 + 50,
          top: Math.random() * 400 + 50,
          width: 60 + Math.random() * 80,
          height: 50 + Math.random() * 70,
          fill: color,
          stroke: '#374151',
          strokeWidth: 2,
          rx: Math.random() * 15,
          ry: Math.random() * 15
        })
        break
      case 'circle':
        obj = new fabric.Circle({
          left: Math.random() * 600 + 50,
          top: Math.random() * 400 + 50,
          radius: 25 + Math.random() * 40,
          fill: color,
          stroke: '#374151',
          strokeWidth: 2
        })
        break
      case 'triangle':
        obj = new fabric.Triangle({
          left: Math.random() * 600 + 50,
          top: Math.random() * 400 + 50,
          width: 50 + Math.random() * 60,
          height: 50 + Math.random() * 60,
          fill: color,
          stroke: '#374151',
          strokeWidth: 2
        })
        break
      case 'text':
        obj = new fabric.IText(`文本${Math.floor(Math.random() * 1000)}`, {
          left: Math.random() * 600 + 50,
          top: Math.random() * 400 + 50,
          fontSize: 16 + Math.random() * 16,
          fill: color,
          fontFamily: 'Arial'
        })
        break
    }

    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
    console.log(`➕ 添加新对象: ${type}`)
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
      console.log(`🎯 全选所有对象: ${objects.length} 个`)
    }
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
      console.log(`🎯 选择所有 ${type} 类型对象: ${objects.length} 个`)
    } else {
      console.log(`❌ 没有找到 ${type} 类型的对象`)
    }
  }

  const selectRandomObjects = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    const allObjects = canvas.getObjects()
    if (allObjects.length === 0) return

    const count = Math.floor(Math.random() * Math.min(5, allObjects.length)) + 1
    const shuffled = [...allObjects].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, count)

    canvas.discardActiveObject()
    if (selected.length === 1) {
      canvas.setActiveObject(selected[0])
    } else {
      const selection = new fabric.ActiveSelection(selected, { canvas })
      canvas.setActiveObject(selection)
    }
    canvas.renderAll()
    console.log(`🎲 随机选择 ${selected.length} 个对象`)
  }

  const deselectAll = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.discardActiveObject()
    canvas.renderAll()
    console.log('🚫 取消所有选择')
  }

  const clearCanvas = () => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current
    canvas.clear()
    canvas.backgroundColor = '#f8fafc'
    canvas.renderAll()
    console.log('🗑️ 清空画布')
    setSelectedObjects([])
  }



  const getModeDescription = () => {
    switch (selectionMode) {
      case 'single':
        return '单击对象进行选择，每次只能选择一个对象'
      case 'area':
        return '拖拽鼠标创建选择区域，选择区域内的所有对象'
      case 'multi':
        return '按住 Shift 键点击多个对象进行多选'
      default:
        return ''
    }
  }

  const getSelectionModeColor = () => {
    switch (selectionMode) {
      case 'single':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'area':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'multi':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧控制面板 */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
            选择模式测试
          </h1>

          {/* 选择模式切换 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">选择模式</h3>
            <div className="space-y-2">
              <button
                onClick={() => switchSelectionMode('single')}
                className={`w-full p-3 rounded-lg border-2 transition-all ${
                  selectionMode === 'single'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <div className="font-medium">单选模式</div>
                <div className="text-sm opacity-90">Single Selection</div>
              </button>

              <button
                onClick={() => switchSelectionMode('area')}
                className={`w-full p-3 rounded-lg border-2 transition-all ${
                  selectionMode === 'area'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                }`}
              >
                <div className="font-medium">区域选择</div>
                <div className="text-sm opacity-90">Area Selection</div>
              </button>

              <button
                onClick={() => switchSelectionMode('multi')}
                className={`w-full p-3 rounded-lg border-2 transition-all ${
                  selectionMode === 'multi'
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <div className="font-medium">多选模式</div>
                <div className="text-sm opacity-90">Multi Selection</div>
              </button>
            </div>

            <div className={`mt-3 p-3 rounded-lg border ${getSelectionModeColor()}`}>
              <div className="text-sm">
                <strong>当前模式:</strong> {selectionMode === 'single' ? '单选' : selectionMode === 'area' ? '区域选择' : '多选'}
              </div>
              <div className="text-xs mt-1">
                {getModeDescription()}
              </div>
            </div>
          </div>

          {/* 添加对象 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">添加对象</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addTestObject('rect')}
                className="bg-red-500 text-white py-2 px-3 rounded hover:bg-red-600 transition-colors text-sm"
              >
                矩形
              </button>
              <button
                onClick={() => addTestObject('circle')}
                className="bg-green-500 text-white py-2 px-3 rounded hover:bg-green-600 transition-colors text-sm"
              >
                圆形
              </button>
              <button
                onClick={() => addTestObject('triangle')}
                className="bg-yellow-500 text-white py-2 px-3 rounded hover:bg-yellow-600 transition-colors text-sm"
              >
                三角形
              </button>
              <button
                onClick={() => addTestObject('text')}
                className="bg-blue-500 text-white py-2 px-3 rounded hover:bg-blue-600 transition-colors text-sm"
              >
                文本
              </button>
            </div>
          </div>

          {/* 选择操作 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">选择操作</h3>
            <div className="space-y-2">
              <button
                onClick={selectAll}
                className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors"
              >
                全选对象
              </button>
              <button
                onClick={selectRandomObjects}
                className="w-full bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600 transition-colors"
              >
                随机选择
              </button>
              <button
                onClick={deselectAll}
                className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors"
              >
                取消选择
              </button>
            </div>
          </div>

          {/* 按类型选择 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">按类型选择</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => selectByType('rect')}
                className="bg-red-400 text-white py-2 px-3 rounded hover:bg-red-500 transition-colors text-sm"
              >
                所有矩形
              </button>
              <button
                onClick={() => selectByType('circle')}
                className="bg-green-400 text-white py-2 px-3 rounded hover:bg-green-500 transition-colors text-sm"
              >
                所有圆形
              </button>
              <button
                onClick={() => selectByType('triangle')}
                className="bg-yellow-400 text-white py-2 px-3 rounded hover:bg-yellow-500 transition-colors text-sm"
              >
                所有三角形
              </button>
              <button
                onClick={() => selectByType('i-text')}
                className="bg-blue-400 text-white py-2 px-3 rounded hover:bg-blue-500 transition-colors text-sm"
              >
                所有文本
              </button>
            </div>
          </div>

          {/* 其他操作 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">其他操作</h3>
            <div className="space-y-2">
              <button
                onClick={clearCanvas}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
              >
                清空画布
              </button>
            </div>
          </div>

          {/* 选中对象信息 */}
          {selectedObjects.length > 0 && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-green-800">选中对象</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p className="font-medium">数量: {selectedObjects.length}</p>
                {selectedObjects.map((obj, index) => (
                  <div key={index} className="pl-2 border-l-2 border-green-300">
                    <p>
                      <span className="font-medium">对象{index + 1}:</span> {obj.type}
                    </p>
                    <p className="text-xs text-green-600">
                      位置: ({obj.left?.toFixed(0)}, {obj.top?.toFixed(0)})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧画布和日志 */}
      <div className="flex-1 flex flex-col">
        {/* 画布区域 */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-lg p-4 h-full">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                画布 - 当前模式: <span className={`px-2 py-1 rounded text-sm ${getSelectionModeColor()}`}>
                  {selectionMode === 'single' ? '单选' : selectionMode === 'area' ? '区域选择' : '多选'}
                </span>
              </h2>
            </div>
            <canvas
              ref={canvasRef}
              className="border border-gray-300 rounded"
            />
          </div>
        </div>


      </div>
    </div>
  )
}

export default SelectionTester
