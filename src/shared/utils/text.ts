export const matchPrefixes = (
  text: string,
  pfxs: string[]
) => {
  // const func__ = "matchPrefixes"
  let matched = false
  pfxs.forEach(pfx => {
    // console.log(func__, { pfx })
    if (text.startsWith(pfx)) {
      // console.log(func__, `${text} matched`)
      matched = true
    }
  })
  return matched
}

export const urlPathnameSectionsValues = (
  pathname: string | null,
  sections: string[],
  separator: string = "/",
) => {
  // const func__ = "urlPathnameSectionsValues"
  if (!pathname) return undefined
  const names = pathname.split(separator)
  if (names.length) {
    const sectionValues: Record<string, string> = {}
    sections.forEach(section => {
      const index = names.indexOf(section)
      if (index > 0 && names.length > index)
        sectionValues[section] = names[index + 1]
    })
    return sectionValues
  }
  return undefined
}

export const urlPathnameSplit = (
  pathname: string,
) => (
  pathname.split(/[\\\/]+/)
)
