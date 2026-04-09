import { fetchUserIssues } from './github'
import { getCredentials, clearCredentials } from '../utils/localStorage'
import { saveToCache, getFromCache, clearCache, shouldRefreshData, cacheKey } from '../utils/cache'

export const fetchIssues = async ({ scope = 'me', state = 'open', forceFresh = false } = {}) => {
  const key = cacheKey(scope, state)
  const shouldRefresh = forceFresh || shouldRefreshData(key)

  const cache = getFromCache(key)
  if (cache && !shouldRefresh) {
    return cache.data
  }

  const credentials = getCredentials()
  if (!credentials) {
    throw new Error('No credentials found')
  }

  try {
    const response = await fetchUserIssues(credentials.pat, credentials.username, { state, scope })
    const issues = response.search.nodes

    const groupedIssues = issues.reduce((acc, issue) => {
      const repoName = issue.repository.nameWithOwner
      if (!acc[repoName]) {
        acc[repoName] = {
          id: issue.repository.id,
          name: issue.repository.name,
          nameWithOwner: repoName,
          viewerLogin: credentials.username,
          issues: []
        }
      }
      acc[repoName].issues.push(issue)
      return acc
    }, {})

    const sortedRepos = Object.values(groupedIssues).sort((a, b) =>
      a.nameWithOwner.localeCompare(b.nameWithOwner)
    )

    sortedRepos.forEach(repo => {
      repo.issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })

    saveToCache(key, sortedRepos)
    return sortedRepos
  } catch (error) {
    if (error.message === 'Authentication failed') {
      clearCredentials()
      clearCache()
    }
    throw error
  }
}

// Merges a list of issue nodes into an org → repo grouped structure (mutating a copy).
export const mergeIssuesIntoOrgData = (existing, issues, viewerLogin) => {
  const orgGroups = { ...existing }
  for (const org of Object.keys(orgGroups)) {
    orgGroups[org] = { ...orgGroups[org] }
    for (const repoKey of Object.keys(orgGroups[org])) {
      const r = orgGroups[org][repoKey]
      orgGroups[org][repoKey] = { ...r, open: [...r.open], closed: [...r.closed] }
    }
  }

  const seen = new Set()
  for (const orgVal of Object.values(orgGroups)) {
    for (const repo of Object.values(orgVal)) {
      for (const i of repo.open) seen.add(i.id)
      for (const i of repo.closed) seen.add(i.id)
    }
  }

  issues.forEach(issue => {
    if (seen.has(issue.id)) return
    seen.add(issue.id)
    const org = issue.repository.owner.login
    const repoName = issue.repository.nameWithOwner
    if (!orgGroups[org]) orgGroups[org] = {}
    if (!orgGroups[org][repoName]) {
      orgGroups[org][repoName] = {
        id: issue.repository.id,
        name: issue.repository.name,
        nameWithOwner: repoName,
        viewerLogin,
        open: [],
        closed: [],
      }
    }
    if (issue.state === 'OPEN') {
      orgGroups[org][repoName].open.push(issue)
    } else {
      orgGroups[org][repoName].closed.push(issue)
    }
  })

  Object.values(orgGroups).forEach(repos => {
    Object.values(repos).forEach(repo => {
      repo.open.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      repo.closed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    })
  })

  return orgGroups
}

// Fetch the next page of issues for a single state. Returns { nodes, pageInfo }.
export const fetchMoreIssuesPage = async ({ scope = 'me', state = 'open', after = null, first = 50, filters = {} } = {}) => {
  const credentials = getCredentials()
  if (!credentials) {
    throw new Error('No credentials found')
  }
  try {
    const response = await fetchUserIssues(credentials.pat, credentials.username, { state, scope, first, after, filters })
    return {
      nodes: response.search.nodes,
      pageInfo: response.search.pageInfo,
    }
  } catch (error) {
    if (error.message === 'Authentication failed') {
      clearCredentials()
      clearCache()
    }
    throw error
  }
}

// Fetches both open and closed issues in parallel, grouped by org → repo.
// Returns: { [org]: { [nameWithOwner]: { id, name, nameWithOwner, viewerLogin, open: [], closed: [] } } }
export const fetchAllIssues = async ({ scope = 'me', forceFresh = false, filters = {} } = {}) => {
  const hasFilters = !!(filters.org || filters.repo || filters.author)
  const key = cacheKey(scope, 'both')
  // Cache only the unfiltered, base view. Filtered fetches always go to the network.
  const shouldRefresh = forceFresh || shouldRefreshData(key)

  if (!hasFilters) {
    const cache = getFromCache(key)
    if (cache && !shouldRefresh) {
      return cache.data
    }
  }

  const credentials = getCredentials()
  if (!credentials) {
    throw new Error('No credentials found')
  }

  try {
    const [openResponse, closedResponse] = await Promise.all([
      fetchUserIssues(credentials.pat, credentials.username, { state: 'open', scope, first: 50, filters }),
      fetchUserIssues(credentials.pat, credentials.username, { state: 'closed', scope, first: 50, filters }),
    ])

    const orgGroups = mergeIssuesIntoOrgData({}, [
      ...openResponse.search.nodes,
      ...closedResponse.search.nodes,
    ], credentials.username)

    const result = {
      orgGroups,
      openPageInfo: openResponse.search.pageInfo,
      closedPageInfo: closedResponse.search.pageInfo,
    }

    if (!hasFilters) saveToCache(key, result)
    return result
  } catch (error) {
    if (error.message === 'Authentication failed') {
      clearCredentials()
      clearCache()
    }
    throw error
  }
}
