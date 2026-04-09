const PREFS_KEY = 'github_issues_prefs'

const defaults = {
  scope: 'me',        // 'me' | 'all'
  state: 'open',      // 'open' | 'closed'
  collapsed: {},      // { [repoNameWithOwner]: true }
  viewMode: 'list',   // 'grid' | 'list'
  filters: {
    orgs: [],         // string[]
    repos: [],        // string[]
    authors: [],      // string[]
  },
}

export const getPreferences = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw)
    return {
      ...defaults,
      ...parsed,
      filters: { ...defaults.filters, ...parsed.filters },
    }
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
