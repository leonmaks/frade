// import Image from "next/image"

import { HorizontalResizablePanels } from "@/shared/ui/panels"

const LeftPanel = () => {
  return (
    <div>
      LeftPanel!
    </div>
  )
}

export default function MainPage() {
  return (
    <HorizontalResizablePanels
      leftPanel={<LeftPanel />}
    >
      MainPage!
    </HorizontalResizablePanels>
  )
}
