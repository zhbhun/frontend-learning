import { useFixtureInput } from "react-cosmos/client"
import { Input } from "@/components/ui/input"

export default () => {
  const [value, setValue] = useFixtureInput("value", "")
  const [placeholder] = useFixtureInput(
    "placeholder",
    "Type something..."
  )
  const [disabled] = useFixtureInput("disabled", false)

  return (
    <div className="flex w-80 flex-col gap-3 p-6">
      <Input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Current value: {value || "(empty)"}
      </p>
    </div>
  )
}
