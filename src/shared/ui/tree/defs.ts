// import { ReactNode } from "react"

// export type TreeNodeType = Record<string, ReactNode>

export type TreeNode<D> = {
  key: string // Unique indexing key
  title: string
  up?: TreeNode<D>
  type?: string
  data?: D
  link?: string
  children?: TreeNode<D>[]
}
