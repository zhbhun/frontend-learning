import { Button } from "@/components/ui/button"

export default {
  Primary: <Button variant="default">Primary Action</Button>,
} satisfies Record<string, React.ReactNode>

// 传递给 decorator 的 options，会作为 DecoratorProps.options 注入
export const options = {
  label: "Options Decorator",
  bgColor: "#8b5cf6",
}
