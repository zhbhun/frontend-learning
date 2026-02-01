interface StatusBarProps {
  connected: boolean
  onlineUsers: number
}

export function StatusBar({ connected, onlineUsers }: StatusBarProps) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">
        Todo List
      </h1>
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-500'
            } animate-pulse`}
          ></span>
          <span className="text-gray-600">
            {connected ? '已连接' : '未连接'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">👥 </span>
          <span className="font-semibold text-blue-600">{onlineUsers}</span>
        </div>
      </div>
    </div>
  )
}
