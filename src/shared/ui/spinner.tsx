import { Loader } from "lucide-react"

export const Spinner = () => (
  <div className="flex items-center justify-center h-full">
    <Loader className="size-5 animate-spin text-muted-foreground" />
  </div>
)
