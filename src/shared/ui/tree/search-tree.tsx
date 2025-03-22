import { TreeNode } from "./defs"

export const searchTree = <D,>(
  top: TreeNode<D> | TreeNode<D>[], matchingTitle: string
): TreeNode<D> | undefined => {

  let result = undefined
  if (Array.isArray(top)) {
    for (const n of top) {
      result = searchTree<D>(n, matchingTitle)
      if (result) return result
    }
  } else if (top.title == matchingTitle) {
    return top
  } else if (top.children && top.children.length) {
    for (const n of top.children) {
      result = searchTree(n, matchingTitle)
      if (result) return result
    }
  }
  return result
}
