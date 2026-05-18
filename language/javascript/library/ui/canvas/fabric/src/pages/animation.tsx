import { useRef, useEffect, useState } from 'react'
import * as fabric from 'fabric'

interface AnimationState {
  isPlaying: boolean
  currentAnimation?: any
  animationType: string
  duration: number
  easingType: string
}

export function AnimationTester() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    currentAnimation: undefined,
    animationType: 'move',
    duration: 1000,
    easingType: 'easeInOutQuad'
  })
  const [animatedObjects, setAnimatedObjects] = useState<fabric.Object[]>([])
  const [loopAnimation, setLoopAnimation] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8fafc',
      selection: true,
      preserveObjectStacking: true,
    })

    fabricCanvasRef.current = canvas
    console.log('Animation Canvas initialized')

    // 创建测试对象
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 80,
      height: 60,
      fill: '#3b82f6',
      stroke: '#2563eb',
      strokeWidth: 2,
      rx: 5,
      ry: 5,
    })

    const circle = new fabric.Circle({
      left: 200,
      top: 200,
      radius: 40,
      fill: '#ef4444',
      stroke: '#dc2626',
      strokeWidth: 2,
    })

    const triangle = new fabric.Triangle({
      left: 300,
      top: 300,
      width: 80,
      height: 80,
      fill: '#22c55e',
      stroke: '#16a34a',
      strokeWidth: 2,
    })

    const text = new fabric.IText('动画文本', {
      left: 400,
      top: 150,
      fontSize: 24,
      fill: '#8b5cf6',
      fontFamily: 'Arial',
      editable: false
    })

    canvas.add(rect, circle, triangle, text)
    setAnimatedObjects([rect, circle, triangle, text])

    // 选择事件监听
    canvas.on('selection:created', (e) => {
      const obj = e.selected?.[0]
      if (obj) {
        setSelectedObject(obj)
        console.log(`🎯 选择对象: ${obj.type}`)
      }
    })

    canvas.on('selection:updated', (e) => {
      const obj = e.selected?.[0]
      if (obj) {
        setSelectedObject(obj)
        console.log(`🔄 切换选择: ${obj.type}`)
      }
    })

    canvas.on('selection:cleared', () => {
      setSelectedObject(null)
      console.log('❌ 清除选择')
    })

    return () => {
      canvas.dispose()
    }
  }, [])

  // 基本动画函数
  const animateMove = (obj: fabric.Object) => {
    const startX = obj.left!
    const endX = Math.random() * (fabricCanvasRef.current!.width! - 100)
    const endY = Math.random() * (fabricCanvasRef.current!.height! - 100)

    const animation = obj.animate({
      left: endX,
      top: endY
    }, {
      duration: animationState.duration,
      easing: fabric.util.ease[animationState.easingType as keyof typeof fabric.util.ease],
      onChange: () => {
        fabricCanvasRef.current?.renderAll()
        const progress = Math.abs(obj.left! - startX) / Math.abs(endX - startX)
        setAnimationProgress(Math.min(progress * 100, 100))
      },
      onComplete: () => {
        console.log('✅ 移动动画完成')
        setAnimationState(prev => ({ ...prev, isPlaying: false }))
        setAnimationProgress(0)
        if (loopAnimation) {
          setTimeout(() => animateMove(obj), 500)
        }
      }
    })

    return animation
  }

  const animateRotate = (obj: fabric.Object) => {
    const startAngle = obj.angle!
    const endAngle = startAngle + 360

    const animation = obj.animate({ angle: endAngle }, {
      duration: animationState.duration,
      easing: fabric.util.ease[animationState.easingType as keyof typeof fabric.util.ease],
      onChange: () => {
        fabricCanvasRef.current?.renderAll()
        const progress = Math.abs(obj.angle! - startAngle) / 360
        setAnimationProgress(Math.min(progress * 100, 100))
      },
      onComplete: () => {
        console.log('✅ 旋转动画完成')
        setAnimationState(prev => ({ ...prev, isPlaying: false }))
        setAnimationProgress(0)
        if (loopAnimation) {
          setTimeout(() => animateRotate(obj), 500)
        }
      }
    })

    return animation
  }

  const animateScale = (obj: fabric.Object) => {
    const startScale = obj.scaleX!
    const targetScale = startScale === 1 ? 1.5 : 1

    const animation = obj.animate({
      scaleX: targetScale,
      scaleY: targetScale
    }, {
      duration: animationState.duration,
      easing: fabric.util.ease[animationState.easingType as keyof typeof fabric.util.ease],
      onChange: () => {
        fabricCanvasRef.current?.renderAll()
        const progress = Math.abs(obj.scaleX! - startScale) / Math.abs(targetScale - startScale)
        setAnimationProgress(Math.min(progress * 100, 100))
      },
      onComplete: () => {
        console.log('✅ 缩放动画完成')
        setAnimationState(prev => ({ ...prev, isPlaying: false }))
        setAnimationProgress(0)
        if (loopAnimation) {
          setTimeout(() => animateScale(obj), 500)
        }
      }
    })

    return animation
  }

  const animateColor = (obj: fabric.Object) => {
    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']
    const newColor = colors[Math.floor(Math.random() * colors.length)]

    const animation = obj.animate({ fill: newColor }, {
      duration: animationState.duration,
      easing: fabric.util.ease[animationState.easingType as keyof typeof fabric.util.ease],
      onChange: () => {
        fabricCanvasRef.current?.renderAll()
        setAnimationProgress(prev => Math.min(prev + 2, 100))
      },
      onComplete: () => {
        console.log('✅ 颜色动画完成')
        setAnimationState(prev => ({ ...prev, isPlaying: false }))
        setAnimationProgress(0)
        if (loopAnimation) {
          setTimeout(() => animateColor(obj), 500)
        }
      }
    })

    return animation
  }

  const animateOpacity = (obj: fabric.Object) => {
    const startOpacity = obj.opacity!
    const targetOpacity = startOpacity > 0.5 ? 0.2 : 1

    const animation = obj.animate({ opacity: targetOpacity }, {
      duration: animationState.duration,
      easing: fabric.util.ease[animationState.easingType as keyof typeof fabric.util.ease],
      onChange: () => {
        fabricCanvasRef.current?.renderAll()
        const progress = Math.abs(obj.opacity! - startOpacity) / Math.abs(targetOpacity - startOpacity)
        setAnimationProgress(Math.min(progress * 100, 100))
      },
      onComplete: () => {
        console.log('✅ 透明度动画完成')
        setAnimationState(prev => ({ ...prev, isPlaying: false }))
        setAnimationProgress(0)
        if (loopAnimation) {
          setTimeout(() => animateOpacity(obj), 500)
        }
      }
    })

    return animation
  }

  // 路径动画
  const animatePath = (obj: fabric.Object) => {
    const canvas = fabricCanvasRef.current!
    const centerX = canvas.width! / 2
    const centerY = canvas.height! / 2
    const radius = 150

    let angle = 0
    const startTime = Date.now()

    const animateStep = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationState.duration, 1)

      angle = progress * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius - obj.width! / 2
      const y = centerY + Math.sin(angle) * radius - obj.height! / 2

      obj.set({
        left: x,
        top: y,
        angle: (angle * 180 / Math.PI) + 90
      })

      canvas.renderAll()
      setAnimationProgress(progress * 100)

      if (progress < 1) {
        requestAnimationFrame(animateStep)
      } else {
        console.log('✅ 路径动画完成')
        setAnimationState(prev => ({ ...prev, isPlaying: false }))
        setAnimationProgress(0)
        if (loopAnimation) {
          setTimeout(() => animatePath(obj), 500)
        }
      }
    }

    requestAnimationFrame(animateStep)
  }

  // 链式动画
  const animateChain = (obj: fabric.Object) => {
    let step = 0
    const steps = [
      () => animateMove(obj),
      () => animateRotate(obj),
      () => animateScale(obj),
      () => animateColor(obj)
    ]

    const executeNextStep = () => {
      if (step < steps.length) {
        console.log(`🔗 执行链式动画步骤 ${step + 1}/${steps.length}`)
        const animation = steps[step]()
        step++

        if (animation) {
          // Note: Setting onComplete directly on animation object
          setTimeout(() => {
            if (step < steps.length) {
              setTimeout(executeNextStep, 300)
            } else {
              console.log('✅ 链式动画完成')
              setAnimationState(prev => ({ ...prev, isPlaying: false }))
              setAnimationProgress(0)
              if (loopAnimation) {
                setTimeout(() => {
                  step = 0
                  executeNextStep()
                }, 1000)
              }
            }
          }, animationState.duration)
        }
      }
    }

    executeNextStep()
  }

  // 多对象同步动画
  const animateMultiple = () => {
    const animations: any[] = []
    let completedCount = 0

    animatedObjects.forEach((obj, index) => {
      const delay = index * 200 // 错开启动时间

      setTimeout(() => {
        let animation: any

        switch (animationState.animationType) {
          case 'move':
            animation = animateMove(obj)
            break
          case 'rotate':
            animation = animateRotate(obj)
            break
          case 'scale':
            animation = animateScale(obj)
            break
          case 'color':
            animation = animateColor(obj)
            break
          default:
            animation = animateMove(obj)
        }

        if (animation) {
          setTimeout(() => {
            completedCount++
            if (completedCount === animatedObjects.length) {
              console.log('✅ 多对象动画完成')
              setAnimationState(prev => ({ ...prev, isPlaying: false }))
              setAnimationProgress(0)
            }
          }, animationState.duration)
        }

        animations.push(animation)
      }, delay)
    })
  }

  // 开始动画
  const startAnimation = () => {
    if (animationState.isPlaying) return

    const targetObj = selectedObject || animatedObjects[0]
    if (!targetObj) return

    setAnimationState(prev => ({ ...prev, isPlaying: true }))
    setAnimationProgress(0)

    let animation: any | undefined

    switch (animationState.animationType) {
      case 'move':
        animation = animateMove(targetObj)
        break
      case 'rotate':
        animation = animateRotate(targetObj)
        break
      case 'scale':
        animation = animateScale(targetObj)
        break
      case 'color':
        animation = animateColor(targetObj)
        break
      case 'opacity':
        animation = animateOpacity(targetObj)
        break
      case 'path':
        animatePath(targetObj)
        break
      case 'chain':
        animateChain(targetObj)
        break
      case 'multiple':
        animateMultiple()
        break
    }

    if (animation) {
      setAnimationState(prev => ({ ...prev, currentAnimation: animation }))
    }

    console.log(`🚀 开始${animationState.animationType}动画`)
  }

  // 停止动画
  const stopAnimation = () => {
    if (animationState.currentAnimation) {
      animationState.currentAnimation.abort()
    }

    // 停止所有对象的动画
    animatedObjects.forEach(obj => {
      // Fabric.js objects don't have animationDuration property in v6
      // Just set objects to their current state
      obj.set({
        left: obj.left,
        top: obj.top,
        angle: obj.angle,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        opacity: obj.opacity
      })
    })

    setAnimationState(prev => ({
      ...prev,
      isPlaying: false,
      currentAnimation: undefined
    }))
    setAnimationProgress(0)
    console.log('⏹️ 停止动画')
  }

  // 重置对象位置
  const resetObjects = () => {
    if (!fabricCanvasRef.current) return

    stopAnimation()

    const positions = [
      { left: 100, top: 100 },
      { left: 200, top: 200 },
      { left: 300, top: 300 },
      { left: 400, top: 150 }
    ]

    animatedObjects.forEach((obj, index) => {
      if (positions[index]) {
        obj.set({
          ...positions[index],
          angle: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1
        })
      }
    })

    fabricCanvasRef.current.renderAll()
    console.log('🔄 重置所有对象')
  }

  const easingOptions = [
    'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
    'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
    'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
    'easeInBounce', 'easeOutBounce', 'easeInOutBounce',
    'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
    'easeInBack', 'easeOutBack', 'easeInOutBack'
  ]

  const animationTypes = [
    { value: 'move', label: '移动动画', description: '随机移动到新位置' },
    { value: 'rotate', label: '旋转动画', description: '360度旋转' },
    { value: 'scale', label: '缩放动画', description: '放大或缩小' },
    { value: 'color', label: '颜色动画', description: '改变填充颜色' },
    { value: 'opacity', label: '透明度动画', description: '改变透明度' },
    { value: 'path', label: '路径动画', description: '沿圆形路径移动' },
    { value: 'chain', label: '链式动画', description: '连续执行多个动画' },
    { value: 'multiple', label: '多对象动画', description: '同时动画多个对象' }
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧控制面板 */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
            动画测试
          </h1>

          {/* 动画类型选择 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">动画类型</h3>
            <div className="space-y-2">
              {animationTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setAnimationState(prev => ({ ...prev, animationType: type.value }))}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    animationState.animationType === type.value
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm opacity-90">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 动画参数 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">动画参数</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  持续时间: {animationState.duration}ms
                </label>
                <input
                  type="range"
                  min="200"
                  max="5000"
                  step="100"
                  value={animationState.duration}
                  onChange={(e) => setAnimationState(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  缓动函数
                </label>
                <select
                  value={animationState.easingType}
                  onChange={(e) => setAnimationState(prev => ({ ...prev, easingType: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {easingOptions.map((easing) => (
                    <option key={easing} value={easing}>
                      {easing}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="loop"
                  checked={loopAnimation}
                  onChange={(e) => setLoopAnimation(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="loop" className="text-sm font-medium text-gray-600">
                  循环播放
                </label>
              </div>
            </div>
          </div>

          {/* 动画控制 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">动画控制</h3>
            <div className="space-y-2">
              <button
                onClick={startAnimation}
                disabled={animationState.isPlaying}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  animationState.isPlaying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {animationState.isPlaying ? '动画播放中...' : '▶️ 开始动画'}
              </button>

              <button
                onClick={stopAnimation}
                disabled={!animationState.isPlaying}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  !animationState.isPlaying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                ⏹️ 停止动画
              </button>

              <button
                onClick={resetObjects}
                className="w-full py-2 px-4 rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              >
                🔄 重置对象
              </button>
            </div>
          </div>

          {/* 动画进度 */}
          {animationState.isPlaying && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">动画进度</h3>
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${animationProgress}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 text-center">
                {animationProgress.toFixed(1)}%
              </div>
            </div>
          )}

          {/* 当前选中对象 */}
          {selectedObject && (
            <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">当前选中</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>类型:</strong> {selectedObject.type}</p>
                <p><strong>位置:</strong> ({selectedObject.left?.toFixed(0)}, {selectedObject.top?.toFixed(0)})</p>
                <p><strong>角度:</strong> {selectedObject.angle?.toFixed(1)}°</p>
                <p><strong>缩放:</strong> {selectedObject.scaleX?.toFixed(2)}x</p>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                💡 选择对象后执行动画将只作用于该对象
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-yellow-800">使用说明</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• 点击对象可选择单个目标</p>
              <p>• 未选择时默认对第一个对象执行动画</p>
              <p>• 多对象动画会同时作用于所有对象</p>
              <p>• 路径动画沿圆形轨迹移动</p>
              <p>• 链式动画依次执行多种效果</p>
              <p>• 可调整持续时间和缓动函数</p>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧画布区域 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-lg p-4 h-full">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                动画画布 - {animationTypes.find(t => t.value === animationState.animationType)?.label}
                {animationState.isPlaying && (
                  <span className="ml-2 text-green-600 text-sm">●播放中</span>
                )}
              </h2>
              <div className="text-sm text-gray-600 mt-2">
                画布上有矩形、圆形、三角形和文本四个测试对象，可选择后执行各种动画效果
              </div>
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

export default AnimationTester
