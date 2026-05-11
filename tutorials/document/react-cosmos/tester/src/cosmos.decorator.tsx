import { ThemeProvider } from "@/components/theme-provider"
import "@/index.css"

export default ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)
