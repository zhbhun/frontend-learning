import { Viewport } from "react-cosmos/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default {
  Mobile: (
    <Viewport width={375} height={667}>
      <Card>
        <CardHeader>
          <CardTitle>Mobile Viewport</CardTitle>
          <CardDescription>375 × 667 — simulating iPhone SE.</CardDescription>
        </CardHeader>
        <CardContent>
          This card is rendered inside a constrained mobile viewport.
        </CardContent>
      </Card>
    </Viewport>
  ),

  Desktop: (
    <Viewport width={1280} height={800}>
      <Card>
        <CardHeader>
          <CardTitle>Desktop Viewport</CardTitle>
          <CardDescription>1280 × 800 — simulating a standard desktop screen.</CardDescription>
        </CardHeader>
        <CardContent>
          This card is rendered inside a wider desktop viewport.
        </CardContent>
      </Card>
    </Viewport>
  ),
} satisfies Record<string, React.ReactNode>
