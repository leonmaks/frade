import {
  ReactNode,
} from "react"

// import {
//   DottedSeparator,
// } from "@/shared"

import { cn } from "@/shared/lib/shadcn-ui-utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/shared/shadcn-ui/card"

// import { SessionLoadingSpinner } from "@/shared/ui/session"

type CardWrapperProps = {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  cardClasses?: string
}

export const CardWrapper = ({
  title,
  description,
  children,
  footer,
  cardClasses,
}: CardWrapperProps) => {
  // const func__ = "CardWrapper"

  return (
    // <SessionLoadingSpinner>
    <Card className={cn(
      "w-full max-w-lg",
      cardClasses
    )}
    >
      <CardHeader className="">
        <CardTitle className="text-3xl font-bold text-center">
          {title}
        </CardTitle>

        {description && (
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        )}
      </CardHeader>

      {/* <div className="px-7">
        <DottedSeparator />
      </div> */}

      <CardContent className="">
        {children}
      </CardContent>

      {footer && (
        <CardFooter
          className="flex justify-center"
        >
          {footer}
        </CardFooter>
      )}
    </Card>
    // </SessionLoadingSpinner>
  )
}
