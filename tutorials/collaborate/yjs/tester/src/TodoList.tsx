import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { generateKeyBetween } from 'fractional-indexing'
import type { Todo } from './types'
import { SortableTodoItem } from './SortableTodoItem'

interface TodoListProps {
  todos: Todo[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Todo>) => void
}

export function TodoList({ todos, onToggle, onDelete, onUpdate }: TodoListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = todos.findIndex((todo) => todo.id === active.id)
    const newIndex = todos.findIndex((todo) => todo.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 使用 arrayMove 获取拖拽后的最终顺序
    const reorderedTodos = arrayMove(todos, oldIndex, newIndex)
    
    // 找到被拖拽元素在新顺序中的位置
    const finalIndex = reorderedTodos.findIndex((todo) => todo.id === active.id)
    
    // 根据新位置的前后元素计算 fractional index
    const prevTodo = finalIndex > 0 ? reorderedTodos[finalIndex - 1] : null
    const nextTodo = finalIndex < reorderedTodos.length - 1 ? reorderedTodos[finalIndex + 1] : null
    
    const prevIndex = prevTodo?.index ?? null
    const nextIndex = nextTodo?.index ?? null

    const newFractionalIndex = generateKeyBetween(prevIndex, nextIndex)

    // 更新被拖拽项的 index
    onUpdate(active.id as string, { index: newFractionalIndex })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {todos.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          暂无任务，添加一个新任务开始吧！
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={todos.map((todo) => todo.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3">
              {todos.map((todo) => (
                <SortableTodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* 统计信息 */}
      {todos.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>总任务: {todos.length}</span>
            <span>已完成: {todos.filter((t) => t.completed).length}</span>
            <span>未完成: {todos.filter((t) => !t.completed).length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
