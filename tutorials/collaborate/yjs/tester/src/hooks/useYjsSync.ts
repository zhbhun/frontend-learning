import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
// import { WebsocketProvider } from 'y-websocket'
import { createYjsProvider, type YSweetProvider } from '@y-sweet/client'
import { useTodoStore } from '../store/todoStore'
import type { Todo } from '../types'

/**
 * 将 Yjs 类型转换为普通 JS 对象（递归处理）
 */
function yjsToPlainObject(yValue: any): any {
  if (yValue instanceof Y.Map) {
    const obj: any = {}
    yValue.forEach((value, key) => {
      obj[key] = yjsToPlainObject(value)
    })
    return obj
  } else if (yValue instanceof Y.Array) {
    return yValue.map((item) => yjsToPlainObject(item))
  } else {
    // 基础类型直接返回
    return yValue
  }
}

/**
 * 将普通 JS 值转换为 Yjs 类型（递归处理）
 */
function plainToYjsValue(value: any): any {
  if (value === null || value === undefined) {
    return value
  }

  if (Array.isArray(value)) {
    const yArray = new Y.Array()
    value.forEach((item) => {
      yArray.push([plainToYjsValue(item)])
    })
    return yArray
  } else if (typeof value === 'object' && value.constructor === Object) {
    const yMap = new Y.Map()
    Object.entries(value).forEach(([key, val]) => {
      yMap.set(key, plainToYjsValue(val))
    })
    return yMap
  } else {
    // 基础类型直接返回
    return value
  }
}

/**
 * Yjs 同步钩子
 * 监听 store 的 delta 事件并同步到 yjs，同时监听远程 yjs 更新并同步到 store
 */
export function useYjsSync() {
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<YSweetProvider | null>(null)
  const ytodosRef = useRef<Y.Map<Y.Map<any>> | null>(null)

  const {
    setConnected,
    setOnlineUsers,
    setTodos,
    subscribeToDelta,
    _internalAddTodo,
    _internalUpdateTodo,
    _internalDeleteTodo,
  } = useTodoStore()

  useEffect(() => {
    // 创建 Yjs 文档
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // 创建 WebSocket Provider
    // const provider = new WebsocketProvider(
    //   'ws://localhost:3002/ws',
    //   'todo-list',
    //   ydoc,
    //   { params: { yauth: authToken } }
    // )
    const provider = createYjsProvider(ydoc, 'todo-list', '/api/auth')
    providerRef.current = provider

    // 获取共享的 Map
    const ytodos = ydoc.getMap<Y.Map<any>>('todos')
    ytodosRef.current = ytodos

    // 监听连接状态
    const handleProviderStatus = (event: { status: string }) => {
      console.log('>> provider status:', event.status)
      setConnected(event.status === 'connected')
    }
    provider.on('status', handleProviderStatus)

    // 监听在线用户数
    const handleAwarenessChange = () => {
      const count = provider.awareness.getStates().size
      console.log('>> provider awareness change', count)
      setOnlineUsers(count)
    }
    provider.awareness.on('change', handleAwarenessChange)

    // 监听远程更新（增量更新）
    const deepObserver = (
      events: Y.YEvent<any>[],
      transaction: Y.Transaction
    ) => {
      if (transaction.local) {
        return
      }
      console.log(
        '>> deepObserver',
        events.map((event) => ({
          currentTarget: event.currentTarget,
          target: event.target,
          keys: event.keys,
          changes: event.changes,
          delta: event.delta,
          path: event.path,
          transaction: event.transaction,
        }))
      )

      // 解析事件，做增量更新
      events.forEach((event) => {
        if (event.target === ytodos) {
          // 顶层 Map 的变化（添加/删除 todo）
          event.keys.forEach((change, key) => {
            if (change.action === 'add') {
              // 新增 todo - 自动转换 Yjs 类型为普通对象
              const todoMap = ytodos.get(key)
              if (todoMap) {
                const todo = yjsToPlainObject(todoMap) as Todo
                _internalAddTodo(todo)
              }
            } else if (change.action === 'delete') {
              _internalDeleteTodo(key as string)
            }
          })
        } else if (event.target instanceof Y.Map && event.path.length === 1) {
          // 某个 todo 的属性变化
          const todoMap = event.target
          const id = todoMap.get('id')

          if (id) {
            const updates: Partial<Todo> = {}
            event.keys.forEach((_, key) => {
              if (key !== 'id') {
                // 自动转换 Yjs 类型为普通值
                updates[key as keyof Todo] = yjsToPlainObject(todoMap.get(key))
              }
            })

            if (Object.keys(updates).length > 0) {
              _internalUpdateTodo(id, updates)
            }
          }
        }
      })
    }

    ytodos.observeDeep(deepObserver)

    // 清理
    return () => {
      ytodos.unobserveDeep(deepObserver)
      provider.off('status', handleProviderStatus)
      provider.awareness.off('change', handleAwarenessChange)
      provider.destroy()
      ydoc.destroy()
    }
  }, [
    setConnected,
    setOnlineUsers,
    setTodos,
    _internalAddTodo,
    _internalUpdateTodo,
    _internalDeleteTodo,
  ])

  // 订阅 delta 事件，只同步 local 来源的操作到 yjs
  useEffect(() => {
    const unsubscribe = subscribeToDelta((delta) => {
      // 只同步本地操作，忽略远程操作（避免死循环）
      if (delta.origin !== 'local') {
        return
      }

      const ydoc = ydocRef.current
      const ytodos = ytodosRef.current
      if (!ydoc || !ytodos) return

      // 同步到 yjs
      ydoc.transact(() => {
        switch (delta.type) {
          case 'add': {
            // 自动转换普通对象为 Yjs Map（包括嵌套对象和数组）
            const todoMap = plainToYjsValue(delta.todo) as Y.Map<any>
            ytodos.set(delta.todo.id, todoMap)
            break
          }

          case 'update': {
            const todoMap = ytodos.get(delta.id)
            if (todoMap) {
              Object.entries(delta.updates).forEach(([key, value]) => {
                if (value !== undefined) {
                  // 自动转换值为 Yjs 类型（如果是对象或数组）
                  todoMap.set(key, plainToYjsValue(value))
                }
              })
            }
            break
          }

          case 'delete': {
            ytodos.delete(delta.id)
            break
          }
        }
      })
    })

    return unsubscribe
  }, [subscribeToDelta])
}
