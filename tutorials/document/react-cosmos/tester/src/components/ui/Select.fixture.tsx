import { useFixtureSelect } from "react-cosmos/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default () => {
  const [variant] = useFixtureSelect("variant", {
    options: ["default", "secondary", "outline", "ghost", "destructive"],
  })

  return (
    <div className="flex w-80 flex-col gap-3 p-6">
      <Select defaultValue={variant}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a variant..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="secondary">Secondary</SelectItem>
          <SelectItem value="outline">Outline</SelectItem>
          <SelectItem value="ghost">Ghost</SelectItem>
          <SelectItem value="destructive">Destructive</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Selected variant: {variant}
      </p>
    </div>
  )
}
