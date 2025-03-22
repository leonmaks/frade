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
