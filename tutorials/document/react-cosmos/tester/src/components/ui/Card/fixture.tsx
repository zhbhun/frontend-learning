import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default {
  // 组件元素：直接输出 JSX
  ElementOutput: (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>This fixture exports a React element directly.</CardDescription>
      </CardHeader>
      <CardContent>Content goes here.</CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">Action</Button>
      </CardFooter>
    </Card>
  ),

  // 函数组件：返回 JSX，包含内部状态
  FunctionComponent: () => {
    const [expanded, setExpanded] = useState(false)

    return (
      <Card className="w-80" onClick={() => setExpanded(!expanded)}>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
          <CardDescription>This fixture exports a function component with state.</CardDescription>
        </CardHeader>
        <CardContent>
          {expanded ? "Card is expanded. Click to collapse." : "Click to expand."}
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </CardFooter>
      </Card>
    )
  },
}
