import { Link } from 'react-router'

export function Home() {
  return (
    <div className="p-6">
      <h1 className="mb-6">Fabric.js 测试页面</h1>

      <ul className="space-y-4">
        <li>
          <div className="mb-2">Object 测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/object/rect" className="underline">
                Rect 测试
              </Link>
            </li>
            <li>
              <Link to="/object/text" className="underline">
                Text 文本测试
              </Link>
            </li>
            <li>
              <Link to="/object/itext" className="underline">
                IText 可编辑文本测试
              </Link>
            </li>
            <li>
              <Link to="/object/textbox" className="underline">
                Textbox 文本框测试
              </Link>
            </li>
            <li>
              <Link to="/object/labeled" className="underline">
                自定义带标签对象
              </Link>
            </li>
            <li>
              <Link to="/object/group" className="underline">
                Group 组合对象测试
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div className="mb-2">Event Object 测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/event/modify" className="underline">
                对象变化事件测试
              </Link>
            </li>
            <li>
              <Link to="/event/control" className="underline">
                对象控制事件测试
              </Link>
            </li>
            <li>
              <Link to="/event/editing" className="underline">
                对象编辑事件测试
              </Link>
            </li>
            <li>
              <Link to="/event/mouse" className="underline">
                鼠标事件测试
              </Link>
            </li>
            <li>
              <Link to="/event/select" className="underline">
                选择事件测试
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div className="mb-2">Control 测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/control/visibility" className="underline">
                Control 样式定制演示
              </Link>
            </li>
            <li>
              <Link to="/control/props" className="underline">
                Control 属性设置测试
              </Link>
            </li>
            <li>
              <Link to="/control/custom" className="underline">
                自定义控制点演示
              </Link>
            </li>
            <li>
              <Link to="/control/resize" className="underline">
                Resize 控制点演示 - 改变 Width/Height
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div className="mb-2">Drawing 绘画测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/brush" className="underline">
                画笔测试
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div className="mb-2">Style 样式测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/style/clippath" className="underline">
                ClipPath 剪切路径测试
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div className="mb-2">Interaction 交互测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/interaction/selection" className="underline">
                Selection 选择模式测试
              </Link>
            </li>
            <li>
              <Link to="/interaction/dragdrop" className="underline">
                DragDrop 拖拽释放测试
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div className="mb-2">Animation 动画测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/animation" className="underline">
                动画效果测试
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div className="mb-2">其他测试</div>
          <ul className="ml-6 space-y-1">
            <li>
              <Link to="/whiteboard" className="underline">
                白板测试
              </Link>
            </li>
            <li>
              <Link to="/hello" className="underline">
                Hello 测试
              </Link>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  )
}

export default Home
