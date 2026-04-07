const PREFS_KEY = 'github_issues_prefs'

const defaults = {
  scope: 'me',        // 'me' | 'all'
  state: 'open',      // 'open' | 'closed'
  collapsed: {},      // { [repoNameWithOwner]: true }
  viewMode: 'grid',   // 'grid' | 'list'
}

export const getPreferences = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...defaults }
    return { ...defaults, ...JSON.parse(raw) }
  } catch {
    return { ...defaults }
  }
}

export const savePreferences = (prefs) => {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export const updatePreference = (patch) => {
  const next = { ...getPreferences(), ...patch }
  savePreferences(next)
  return next
}

export const toggleCollapsed = (repoName) => {
  const prefs = getPreferences()
  const collapsed = { ...prefs.collapsed }
  if (collapsed[repoName]) delete collapsed[repoName]
  else collapsed[repoName] = true
  savePreferences({ ...prefs, collapsed })
  return collapsed
}
