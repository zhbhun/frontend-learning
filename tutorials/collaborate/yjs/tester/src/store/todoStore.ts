import { create } from 'zustand'
import { generateKeyBetween } from 'fractional-indexing'
import type { Todo } from '../types'

export type TodoDelta =
  | { type: 'add'; todo: Todo; origin: 'local' | 'remote' }
  | { type: 'update'; id: string; updates: Partial<Todo>; origin: 'local' | 'remote' }
  | { type: 'delete'; id: string; origin: 'local' | 'remote' }

type DeltaListener = (delta: TodoDelta) => void

interface TodoState {
  // 内部存储：使用 Record 提高查找效率
  todos: Record<string, Todo>
  connected: boolean
  onlineUsers: number
  // 派生状态：获取排序后的数组
  getTodos: () => Todo[]
  // 设置方法
  setTodos: (todos: Todo[]) => void
  addTodo: (text: string) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  toggleTodo: (id: string) => void
  setConnected: (connected: boolean) => void
  setOnlineUsers: (count: number) => void
  // Delta 监听
  subscribeToDelta: (listener: DeltaListener) => () => void
  // 内部方法：用于同步层调用（不触发 delta）
  _internalAddTodo: (todo: Todo) => void
  _internalUpdateTodo: (id: string, updates: Partial<Todo>) => void
  _internalDeleteTodo: (id: string) => void
}

// Delta 监听器存储
const deltaListeners = new Set<DeltaListener>()

const emitDelta = (delta: TodoDelta) => {
  deltaListeners.forEach((listener) => listener(delta))
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: {},
  connected: false,
  onlineUsers: 0,

  // 派生状态：获取排序后的数组
  getTodos: () => {
    const { todos } = get()
    return Object.values(todos).sort((a, b) => {
      if (a.index < b.index) return -1
      if (a.index > b.index) return 1
      return 0
    })
  },

  setTodos: (todosArray) => {
    const todos: Record<string, Todo> = {}
    todosArray.forEach((todo) => {
      todos[todo.id] = todo
    })
    set({ todos })
  },

  // 业务操作方法（会触发 local delta 并同步到 yjs）
  addTodo: (text: string) => {
    if (text.trim() === '') return

    const todos = get().getTodos()
    const lastIndex = todos.length > 0 ? todos[todos.length - 1].index : null
    const newIndex = generateKeyBetween(lastIndex, null)

    const newTodo: Todo = {
      id: `todo-${Date.now()}-${Math.random()}`,
      text,
      completed: false,
      index: newIndex,
    }

    get()._internalAddTodo(newTodo)
    emitDelta({ type: 'add', todo: newTodo, origin: 'local' })
  },

  updateTodo: (id: string, updates: Partial<Todo>) => {
    get()._internalUpdateTodo(id, updates)
    emitDelta({ type: 'update', id, updates, origin: 'local' })
  },

  deleteTodo: (id: string) => {
    get()._internalDeleteTodo(id)
    emitDelta({ type: 'delete', id, origin: 'local' })
  },

  toggleTodo: (id: string) => {
    const todo = get().todos[id]
    if (!todo) return
    const updates = { completed: !todo.completed }
    get()._internalUpdateTodo(id, updates)
    emitDelta({ type: 'update', id, updates, origin: 'local' })
  },

  setConnected: (connected) => set({ connected }),

  setOnlineUsers: (count) => set({ onlineUsers: count }),

  // Delta 监听
  subscribeToDelta: (listener: DeltaListener) => {
    deltaListeners.add(listener)
    return () => deltaListeners.delete(listener)
  },

  // 内部方法：直接修改状态，不触发 delta（用于远程同步）
  _internalAddTodo: (todo: Todo) =>
    set((state) => ({
      todos: { ...state.todos, [todo.id]: todo },
    })),

  _internalUpdateTodo: (id: string, updates: Partial<Todo>) =>
    set((state) => {
      const todo = state.todos[id]
      if (!todo) return state
      return {
        todos: {
          ...state.todos,
          [id]: { ...todo, ...updates },
        },
      }
    }),

  _internalDeleteTodo: (id: string) =>
    set((state) => {
      const { [id]: removed, ...rest } = state.todos
      return { todos: rest }
    }),
}))
