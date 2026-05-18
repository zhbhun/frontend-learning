import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import * as fabric from 'fabric'
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  Square3Stack3DIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'

export interface GroupTesterProps {
  className?: string
}

export function GroupTester({ className = '' }: GroupTesterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [groupOpacity, setGroupOpacity] = useState(1)
  const [groupAngle, setGroupAngle] = useState(0)
  const [groupScaleX, setGroupScaleX] = useState(1)
  const [groupScaleY, setGroupScaleY] = useState(1)
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([])

  // 获取当前选中的单个组（如果有的话）
  const getSelectedGroup = useCallback((): fabric.Group | null => {
    return selectedObjects.length === 1 && selectedObjects[0].type === 'group'
      ? (selectedObjects[0] as fabric.Group)
      : null
  }, [selectedObjects])

  // 处理选择变化（作为 Fabric.js 事件回调）
  const handleSelectionChange = useCallback(() => {
    if (!fabricCanvasRef.current) return

    // 使用 getActiveObjects 获取所有当前选中的对象（包括 Shift+点击多选的情况）
    const selectedObjs = fabricCanvasRef.current.getActiveObjects()

    // 更新选中对象列表
    setSelectedObjects(selectedObjs)

    // 如果选中的是单个组，同步属性面板
    if (selectedObjs.length === 1 && selectedObjs[0].type === 'group') {
      const group = selectedObjs[0] as fabric.Group
      setGroupOpacity(group.opacity || 1)
      setGroupAngle(group.angle || 0)
      setGroupScaleX(group.scaleX || 1)
      setGroupScaleY(group.scaleY || 1)
    }
  }, [])

  // 处理选择清除
  const handleSelectionCleared = useCallback(() => {
    setSelectedObjects([])
  }, [])

  // 处理对象修改
  const handleObjectModified = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll()
    }
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
      })

      console.log('canvas', canvas)
      fabricCanvasRef.current = canvas

      const disposes: VoidFunction[] = []

      // 添加画布事件监听器
      disposes.push(canvas.on('selection:created', handleSelectionChange))
      disposes.push(canvas.on('selection:updated', handleSelectionChange))
      disposes.push(canvas.on('selection:cleared', handleSelectionCleared))
      disposes.push(canvas.on('object:modified', handleObjectModified))

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
        disposes.forEach((dispose) => dispose())
        canvas.dispose()
      }
    }
  }, [handleSelectionChange, handleSelectionCleared, handleObjectModified])

  // 更新选中组的属性
  const updateSelectedGroup = useCallback(
    (property: string, value: string | number) => {
      const selectedGroup = getSelectedGroup()
      if (!selectedGroup || !fabricCanvasRef.current) return

      selectedGroup.set(property, value)
      fabricCanvasRef.current.renderAll()
    },
    [getSelectedGroup],
  )

  // 创建基础对象示例
  const createBasicObjects = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current

    // 创建一个矩形
    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 100,
      height: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
    })

    // 创建一个圆形
    const circle = new fabric.Circle({
      left: 200,
      top: 100,
      radius: 30,
      fill: '#ef4444',
      stroke: '#dc2626',
      strokeWidth: 2,
    })

    // 创建一个三角形
    const triangle = new fabric.Triangle({
      left: 300,
      top: 100,
      width: 60,
      height: 60,
      fill: '#10b981',
      stroke: '#059669',
      strokeWidth: 2,
    })

    canvas.add(rect, circle, triangle)
    canvas.renderAll()
  }, [])

  // 创建卡片示例
  const createCardExample = useCallback(() => {
    if (!fabricCanvasRef.current) return

    const canvas = fabricCanvasRef.current

    // 创建卡片背景
    const cardBg = new fabric.Rect({
      left: 400,
      top: 150,
      width: 200,
      height: 120,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      rx: 8,
      ry: 8,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.1)',
        blur: 10,
        offsetX: 0,
        offsetY: 4,
      }),
    })

    // 创建标题
    const title = new fabric.FabricText('Card Title', {
      left: 420,
      top: 170,
      fontSize: 18,
      fontFamily: 'Arial',
      fill: '#1f2937',
      fontWeight: 'bold',
    })

    // 创建内容
    const content = new fabric.FabricText('This is a sample card content', {
      left: 420,
      top: 200,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#6b7280',
    })

    // 创建按钮
    const button = new fabric.Rect({
      left: 420,
      top: 230,
      width: 80,
      height: 30,
      fill: '#3b82f6',
      rx: 4,
      ry: 4,
    })

    const buttonText = new fabric.FabricText('Button', {
      left: 440,
      top: 238,
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#ffffff',
    })

    canvas.add(cardBg, title, content, button, buttonText)
    canvas.renderAll()
  }, [])

  // 创建组
  const createGroup = useCallback(() => {
    if (!fabricCanvasRef.current) return
    const canvas = fabricCanvasRef.current
    const activeObject = canvas.getActiveObject() as
      | fabric.ActiveSelection
      | undefined
    if (!activeObject) {
      return
    }
    if (
      activeObject.type !== 'activeSelection' &&
      activeObject.type !== 'activeselection'
    ) {
      return
    }
    const group = new fabric.Group(activeObject.removeAll(), {
      subTargetCheck: true,
      interactive: true,
    })
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
  }, [])

  // 解散组
  const ungroupSelected = useCallback(() => {
    const selectedGroup = getSelectedGroup()
    if (!selectedGroup || !fabricCanvasRef.current) return
    const canvas = fabricCanvasRef.current
    canvas.remove(selectedGroup)
    const sel = new fabric.ActiveSelection(selectedGroup.removeAll(), {
      canvas: canvas,
    })
    canvas.setActiveObject(sel)
    canvas.requestRenderAll()
  }, [getSelectedGroup])

  // 从组中移除对象
  const removeObjectFromGroup = useCallback(
    (obj: fabric.Object) => {
      const selectedGroup = getSelectedGroup()
      if (!selectedGroup || !fabricCanvasRef.current) return

      const canvas = fabricCanvasRef.current

      // 计算对象在组变换下的世界坐标（在移除之前）
      const groupMatrix = selectedGroup.calcTransformMatrix()
      const point = new fabric.Point(obj.left || 0, obj.top || 0)
      const transformedPoint = fabric.util.transformPoint(point, groupMatrix)

      // 从组中移除对象
      selectedGroup.remove(obj)

      // 设置对象的正确位置和变换
      obj.set({
        left: transformedPoint.x,
        top: transformedPoint.y,
        // 如果组有旋转，需要加上组的旋转角度
        angle: (obj.angle || 0) + (selectedGroup.angle || 0),
        // 如果组有缩放，需要相应调整对象的缩放
        scaleX: (obj.scaleX || 1) * (selectedGroup.scaleX || 1),
        scaleY: (obj.scaleY || 1) * (selectedGroup.scaleY || 1),
      })

      canvas.add(obj)
      canvas.renderAll()
    },
    [getSelectedGroup],
  )

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (!fabricCanvasRef.current) return

    fabricCanvasRef.current.clear()
    setSelectedObjects([])
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
    link.download = 'group-tester.png'
    link.href = dataURL
    link.click()
  }, [])

  // 获取组内对象列表
  const getGroupObjects = useCallback(() => {
    const selectedGroup = getSelectedGroup()
    if (!selectedGroup) return []
    return selectedGroup.getObjects()
  }, [getSelectedGroup])

  // 切换对象可见性
  const toggleObjectVisibility = useCallback((obj: fabric.Object) => {
    if (!fabricCanvasRef.current) return

    obj.set('visible', !obj.visible)
    fabricCanvasRef.current.renderAll()
  }, [])

  return (
    <div className={`flex h-screen w-screen flex-col ${className}`}>
      {/* 工具栏 */}
      <div className="border-b border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          {/* 分组操作 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={createGroup}
              disabled={selectedObjects.length < 2}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                selectedObjects.length >= 2
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400'
              }`}
              title="创建组"
            >
              创建组
            </button>
            <button
              onClick={ungroupSelected}
              disabled={!getSelectedGroup()}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                getSelectedGroup()
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400'
              }`}
              title="解散组"
            >
              解散组
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
              onClick={exportCanvas}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              导出
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧控制面板 */}
        <div className="w-80 overflow-y-auto border-r border-gray-200 bg-white p-4">
          <div className="space-y-6">
            {/* 创建示例 */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                创建示例
              </h3>
              <div className="space-y-2">
                <button
                  onClick={createBasicObjects}
                  className="w-full rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-200"
                >
                  <Square3Stack3DIcon className="mr-2 inline h-4 w-4" />
                  基础图形
                </button>
                <button
                  onClick={createCardExample}
                  className="w-full rounded-lg bg-purple-100 px-3 py-2 text-sm text-purple-700 transition-colors hover:bg-purple-200"
                >
                  <PlusIcon className="mr-2 inline h-4 w-4" />
                  卡片组件
                </button>
              </div>
            </div>

            {/* 组属性控制 */}
            {getSelectedGroup() && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  组属性
                </h3>
                <div className="space-y-4">
                  {/* 透明度 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      透明度
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={groupOpacity}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setGroupOpacity(value)
                        updateSelectedGroup('opacity', value)
                      }}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-500">
                      {groupOpacity}
                    </span>
                  </div>

                  {/* 旋转角度 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      旋转角度
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={groupAngle}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setGroupAngle(value)
                        updateSelectedGroup('angle', value)
                      }}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-500">{groupAngle}°</span>
                  </div>

                  {/* 水平缩放 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      水平缩放
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={groupScaleX}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setGroupScaleX(value)
                        updateSelectedGroup('scaleX', value)
                      }}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-500">
                      {groupScaleX}x
                    </span>
                  </div>

                  {/* 垂直缩放 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      垂直缩放
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={groupScaleY}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setGroupScaleY(value)
                        updateSelectedGroup('scaleY', value)
                      }}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-500">
                      {groupScaleY}x
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 组内对象列表 */}
            {getSelectedGroup() && (
              <div>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  组内对象
                </h3>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {getGroupObjects().map((obj, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded border border-gray-200 p-2"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {obj.type || 'Object'} {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleObjectVisibility(obj)}
                          className="rounded p-1 transition-colors hover:bg-gray-100"
                          title={obj.visible ? '隐藏' : '显示'}
                        >
                          {obj.visible ? (
                            <EyeIcon className="h-4 w-4 text-gray-500" />
                          ) : (
                            <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => removeObjectFromGroup(obj)}
                          className="rounded p-1 transition-colors hover:bg-gray-100"
                          title="从组中移除"
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 使用说明 */}
            <div className="space-y-2 text-sm text-gray-600">
              <h4 className="font-medium text-gray-900">使用说明：</h4>
              <ul className="list-inside list-disc space-y-1">
                <li>点击示例按钮创建对象</li>
                <li>按住 Ctrl/Cmd 多选对象</li>
                <li>选中多个对象后点击"创建组"</li>
                <li>选中组后可调整组的属性</li>
                <li>可以管理组内的单个对象</li>
                <li>点击"解散组"拆分组</li>
                <li>拖拽组可移动整个组</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="mb-2 text-center text-sm text-gray-600">
            选择模式：点击选择对象或组，支持框选和 Shift+点击多选
            {selectedObjects.length > 1 && (
              <span className="ml-2 text-blue-600">
                已选择 {selectedObjects.length} 个对象
              </span>
            )}
          </div>
          <div
            ref={canvasWrapperRef}
            className="h-full w-full overflow-hidden rounded-lg bg-white shadow-lg"
          >
            <canvas ref={canvasRef} className="block h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupTester
