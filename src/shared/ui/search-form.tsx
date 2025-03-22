import { Input } from "../shadcn-ui/input"

import { SearchIcon } from "../icons"

export const SearchForm = () => (
  <form>
    <div className="relative">
      <SearchIcon className="absolute left-2 top-3 size-4 text-muted-foreground" />
      <Input placeholder="Search" className="h-10 pl-8 rounded-full" />
    </div>
  </form>
)
