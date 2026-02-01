interface TodoInputProps {
  value: string
  onChange: (value: string) => void
  onAdd: () => void
}

export function TodoInput({ value, onChange, onAdd }: TodoInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAdd()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="添加新任务..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyDown={handleKeyPress}
        />
        <button
          onClick={onAdd}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 font-medium"
        >
          添加
        </button>
      </div>
    </div>
  )
}
