import { Separator } from "@/shared/shadcn-ui/separator"

import { MainSection } from "./main-section"
import { PersonalSection } from "./personal-section"

export const GlobalSidebarContent = () => {
  return (
    <>
      <MainSection />
      <Separator />
      <PersonalSection />
    </>
  )
}
