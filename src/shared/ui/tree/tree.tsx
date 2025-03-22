"use client"

import { useState } from "react"
import { isEmpty } from "lodash-es"
// import { usePathname, useRouter } from "next/navigation"
import {
  ChevronRightIcon,
  DotIcon,
  EllipsisIcon,
  FileIcon,
  PlusIcon,
  // DotIcon,
} from "lucide-react"

import { cn } from "@/shared/shadcn-ui/utils"
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
import { TreeNodeRender } from "./tree-node-render"

//
// Tree
//

type TreeProps<D> = {
  treeNodes: TreeNode<D>[]
  // treeNodeTypes?: TreeNodeType
  onNew?: (n?: D) => void
  titleClassName?: string
}

export function Tree<D>({
  treeNodes,
  // treeNodeTypes = {},
  onNew,
  titleClassName,
}: TreeProps<D>) {
  // const func__ = "Tree"

  // console.log(func__, "props", { treeNodes })

  return (
    <div className="">
      {treeNodes.map(n => {
        // console.log(func__, "map", { n })
        return (
          <TreeNodeRender<D>
            key={n.key}
            treeNode={n}
            // treeNodeTypes={treeNodeTypes}
            onNew={onNew}
            titleClassName={titleClassName}
            level={0}
          />
        )
      })}
    </div>
  )
}
