"use client"

import { useState } from "react"
// import { isEmpty } from "lodash-es"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronRightIcon,
  // DotIcon,
  // EllipsisIcon,
  // FileIcon,
  PlusIcon,
  // DotIcon,
} from "lucide-react"

import { cn } from "@/shared/lib/shadcn-ui-utils"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/shared/shadcn-ui/dropdown-menu"

import {
  TreeNode,
  // TreeNodeType
} from "./defs"
import { Hint } from "../hint"
import { Button } from "@/shared/shadcn-ui/button"

import { TreeNodeIcon } from "./tree-node-icon"

// const Margin = ({
//   uk,
//   level
// }: {
//   uk: string,
//   level: number
// }) => {
//   const idents = []
//   for (let i = 0; i < level; i++) {
//     idents.push(
//       <Indent key={`${uk}-${i}`} />
//     )
//   }
//   return <div className="flex shrink-0">{idents}</div>
// }

// 
// Tree Node Render
// 

type TreeNodeRenderProps<D> = {
  treeNode: TreeNode<D>
  // treeNodeTypes: TreeNodeType
  onNew?: (n?: D) => void
  onNewHint?: string
  titleClassName?: string
  level: number
}

export const TreeNodeRender = <D,>({
  treeNode,
  // treeNodeTypes,
  onNew,
  onNewHint,
  titleClassName,
  level,
}: TreeNodeRenderProps<D>) => {
  // const func__ = "TreeNodeRender"
  const [isOpen, setIsOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // console.log(func__, "props", { treeNode })

  const isCurrentNode = () => {
    if (treeNode.link) return treeNode.link === pathname
    return treeNode.key === pathname.split("/").pop()
  }

  // console.log(func__, { onNew })

  const indentStep = 12
  const margin = indentStep * level

  return (
    <>
      <div
        className={cn(
          "relative flex items-center cursor-pointer hover:bg-sky-100 group",
          isCurrentNode() && "bg-red-100 hover:bg-red-100",
        )}
      >

        {onNew && (
          <Hint label={onNewHint || "Create Child Node"} side="top" align="center">
            <Button
              onClick={() => onNew(treeNode.data)}
              variant="ghost"
              size="sm"
              className="absolute p-0 text-sm transition-opacity bg-transparent opacity-0 right-1 top-1 group-hover:opacity-100 size-4 hover:bg-sky-200"
            >
              <PlusIcon className="size-4" />
            </Button>
          </Hint>
        )}

        <div
          className={`flex items-stretch`}
          style={{ marginLeft: `${margin}px` }}
        >

          {(treeNode.children && treeNode.children.length) ? (

            <div
              onClick={() => { setIsOpen(s => !s) }}
              className="flex items-stretch"
            >

              <div
                className="flex items-center w-3 shrink-0"
              >
                <ChevronRightIcon
                  className={cn(
                    "w-3 h-3 bg-sky-200",
                    isOpen && "rotate-90 bg-transparent"
                  )}
                />
              </div>
            </div>

          ) : (
            <div className="items-stretch w-3 shrink-0"></div>
          )}


          <div
            onClick={() => {
              if (treeNode.link && treeNode.link.length > 0) {
                router.push(treeNode.link)
              }
            }}
            className="flex items-center grow"
          >

            <TreeNodeIcon type={treeNode.type} />

            {/* {treeNode.type === "file" ? (
              <FileIcon strokeWidth={1} className="size-3 shrink-0" />
            ) : (
              <DotIcon strokeWidth={1} className="size-3 shrink-0" />
            )} */}

            <div
              className={cn(
                "ml-0.5",
                titleClassName || ""
              )}
            >
              {treeNode.title || "Undefined"}
            </div>
          </div>
        </div>
      </div>

      {isOpen && treeNode.children && (
        <>
          {treeNode.children.map(n => {
            // console.log(func__, "render-children", {
            //   isOpen, children: treeNode.children, n,
            // })

            return (
              <TreeNodeRender
                key={n.key}
                treeNode={n}
                // treeNodeTypes={treeNodeTypes}
                onNew={onNew}
                titleClassName={titleClassName}
                level={level + 1}
              />
            )
          })}
        </>
      )}
    </>
  )
}
