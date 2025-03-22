type SidebarSectionHeaderProps = {
  title: string,
  actionButton?: () => JSX.Element
}

export const SidebarSectionHeader = ({
  title,
  actionButton: ActionButton,
}: SidebarSectionHeaderProps) => {

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase text-neutral-500">
        {title}
      </p>
      {ActionButton && <ActionButton />}
    </div>
  )
}
