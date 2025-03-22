import Image from "next/image"

import { cn } from "@/shared/lib/shadcn-ui-utils"
import {
  Avatar,
  AvatarFallback
} from "@/shared/shadcn-ui/avatar"

type ImageAvatarProps = {
  image?: string
  name: string
  className?: string
  fallbackClassName?: string
}

export const ImageAvatar = ({
  image,
  name,
  className,
  fallbackClassName,
}: ImageAvatarProps) => {

  if (image) {
    return (
      <div className={cn(
        "size-10 relative rounded-md overflow-hidden",
        className,
      )}>
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <Avatar
      className={cn(
        "size-10 rounded-md",
        className,
      )}
    >
      <AvatarFallback
        className={cn(
          "text-white bg-blue-600 font-semibold text-lg uppercase rounded-md",
          fallbackClassName,
        )}
      >
        {name[0]}
      </AvatarFallback>
    </Avatar>
  )
}
