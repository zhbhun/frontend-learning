import type { DecoratorProps } from "react-cosmos/client"

type Options = {
  label: string
  bgColor: string
}

// 演示：带 options 的 decorator
// fixture 可以通过 options 导出控制 decorator 行为
export default ({ children, options }: DecoratorProps<Options>) => (
  <div
    style={{
      border: "2px solid #8b5cf6",
      borderRadius: 8,
      padding: 12,
    }}
  >
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#fff",
        background: options.bgColor,
        padding: "4px 12px",
        borderRadius: 4,
        marginBottom: 8,
        display: "inline-block",
      }}
    >
      {options.label}
    </div>
    {children}
  </div>
)
