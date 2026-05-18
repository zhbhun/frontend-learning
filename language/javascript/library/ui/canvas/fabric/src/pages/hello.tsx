import { Link } from 'react-router'

export function Hello() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Fabric.js 测试组件
        </h1>
        <div className="space-y-4">
          <Link
            to="/whiteboard"
            className="block w-64 mx-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            白板组件
          </Link>
          <Link
            to="/object/path"
            className="block w-64 mx-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Path 测试组件
          </Link>
          <Link
            to="/object/rect"
            className="block w-64 mx-auto bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Rect 测试组件
          </Link>
        </div>
      </div>
    </div>
  )
}
