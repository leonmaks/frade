import { Poppins } from "next/font/google"
import Image from "next/image"

import { cn } from "@/shared/lib/shadcn-ui-utils"

import {
  APP_BRAND_NAME,
  // MAIN_LOGO_HEIGHT,
  // MAIN_LOGO_WIDTH
} from "@/shared/config"

const font = Poppins({
  subsets: ["latin"],
  weight: ["600"]
})

export const MainLogo = () => {
  return (
    <div className="p-2 flex items-center gap-1">

      <Image
        src="/logo.svg"
        alt="Logo"
        height="0"
        width="0"
        className="h-[24px] w-auto"
      // height={MAIN_LOGO_HEIGHT}
      // width={MAIN_LOGO_WIDTH}
      />

      <p className={cn(
        "text-2xl font-semibold tracking-tight",
        font.className,
      )}
      >
        {APP_BRAND_NAME}
      </p>
    </div>
  )
}
