import { DotIcon, FileIcon } from "lucide-react"

const strokeWidth = 0.5
const className = "size-3 shrink-0"

const treeNodeTypes: Record<string, { icon: JSX.Element }> = {
  "file": {
    icon: <FileIcon
      strokeWidth={strokeWidth}
      className={className}
    />
  },
}

const defaultIcon = <DotIcon
  strokeWidth={strokeWidth}
  className={className}
/>

type IconProps = {
  type?: string
}

export const TreeNodeIcon = ({
  type,
}: IconProps) => {

  if (type) {
    const icon = treeNodeTypes[type].icon
    if (icon) return icon
  }
  return defaultIcon
}
