import { ReactNode } from "react"
import { useMedia } from "react-use"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/shadcn-ui/dialog"
import { Drawer, DrawerContent } from "@/shared/shadcn-ui/drawer"

type ResponsiveModalProps = {
  children: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ResponsiveModal = ({
  children,
  open,
  onOpenChange,
}: ResponsiveModalProps) => {

  // const isDesktop = useMedia("(min-width: 1024px)", true)

  // if (isDesktop) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="w-full sm:max-w-lg p-0 border-none overflow-y-auto hide-scrollbar max-h-[85vh]"
      >
        <DialogHeader>
          <DialogTitle>Dialog Title!</DialogTitle>
          <DialogDescription>
            Dialog Description!
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
  // }

  // return (
  //   <Drawer
  //     open={open}
  //     onOpenChange={onOpenChange}
  //   >
  //     <DrawerContent>
  //       <div
  //         className="overflow-y-auto hide-scrollbar max-h-[85vh]"
  //       >
  //         {children}
  //       </div>
  //     </DrawerContent>
  //   </Drawer>
  // )
}
