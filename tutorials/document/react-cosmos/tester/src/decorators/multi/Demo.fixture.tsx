import { Button } from "@/components/ui/button"

// 被 decorators/multi/ 下的多个 decorator 同时装饰
export default {
  Default: <Button variant="outline">Multi-Decorated Button</Button>,
} satisfies Record<string, React.ReactNode>
