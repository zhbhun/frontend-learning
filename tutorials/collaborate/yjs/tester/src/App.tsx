import { useState } from 'react'
import { useTodoStore } from './store/todoStore'
import { useYjsSync } from './hooks/useYjsSync'
import { StatusBar } from './StatusBar'
import { TodoInput } from './TodoInput'
import { TodoList } from './TodoList'

function App() {
  const [inputValue, setInputValue] = useState('')
  
  // 使用 zustand store 获取状态和方法
  const { 
    getTodos, 
    connected, 
    onlineUsers, 
    addTodo, 
    toggleTodo, 
    deleteTodo, 
    updateTodo 
  } = useTodoStore()
  
  // 获取排序后的 todos 数组
  const todos = getTodos()
  
  // 接入 yjs 同步（可选，随时可以注释掉这行来禁用同步）
  useYjsSync()

  const handleAddTodo = () => {
    addTodo(inputValue)
    setInputValue('')
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <StatusBar connected={connected} onlineUsers={onlineUsers} />
        <TodoInput value={inputValue} onChange={setInputValue} onAdd={handleAddTodo} />
        <TodoList
          todos={todos}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onUpdate={updateTodo}
        />
      </div>
    </div>
  )
}

export default App
