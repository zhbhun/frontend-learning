import { Button } from "@/components/ui/button"

export default {
  Default: <Button>Button</Button>,
  Secondary: <Button variant="secondary">Secondary</Button>,
  Outline: <Button variant="outline">Outline</Button>,
  Ghost: <Button variant="ghost">Ghost</Button>,
  Destructive: <Button variant="destructive">Destructive</Button>,
  Link: <Button variant="link">Link</Button>,
  "Size XS": <Button size="xs">Extra Small</Button>,
  "Size SM": <Button size="sm">Small</Button>,
  "Size LG": <Button size="lg">Large</Button>,
  "Icon Default": (
    <Button size="icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
        <line x1="4" x2="20" y1="21" y2="21" />
      </svg>
    </Button>
  ),
  Disabled: <Button disabled>Disabled</Button>,
} satisfies Record<string, React.ReactNode>
