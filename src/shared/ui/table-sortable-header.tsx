import { HeaderContext } from "@tanstack/react-table"

import { ArrowUpDown } from "lucide-react"

import { Button } from "../ui/button"

export const TableSortableHeader = <Th, Td>(
  { column }: HeaderContext<Th, Td>, columnName: string
) => (
  <Button
    variant="transparent"
    size="narrow"
    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  >
    {columnName}
    <ArrowUpDown className="w-3 h-3 ml-1" />
  </Button>
)
export default TableSortableHeader
