// 演示：多个 decorator 叠加（数组导出）
// 每个 decorator 会在被装饰的 fixture 外层叠加一层包裹

const BorderDecorator = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      border: "2px dashed #3b82f6",
      borderRadius: 8,
      padding: 12,
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: "#3b82f6",
        marginBottom: 8,
      }}
    >
      Decorator 1: Dashed Border
    </div>
    {children}
  </div>
)

const HighlightDecorator = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      background: "linear-gradient(135deg, #fef9c3, #fef08a)",
      borderRadius: 8,
      padding: 12,
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: "#a16207",
        marginBottom: 8,
      }}
    >
      Decorator 2: Highlight Background
    </div>
    {children}
  </div>
)

// 数组导出 — Cosmos 按顺序叠加：BorderDecorator 包裹 HighlightDecorator
export default [BorderDecorator, HighlightDecorator]
