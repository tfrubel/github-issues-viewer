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

// Fetches both open and closed issues in parallel, grouped by org → repo.
// Returns: { [org]: { [nameWithOwner]: { id, name, nameWithOwner, viewerLogin, open: [], closed: [] } } }
export const fetchAllIssues = async ({ scope = 'me', forceFresh = false } = {}) => {
  const key = cacheKey(scope, 'both')
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
    const [openResponse, closedResponse] = await Promise.all([
      fetchUserIssues(credentials.pat, credentials.username, { state: 'open', scope }),
      fetchUserIssues(credentials.pat, credentials.username, { state: 'closed', scope }),
    ])

    const allIssues = [
      ...openResponse.search.nodes,
      ...closedResponse.search.nodes,
    ]

    const orgGroups = {}
    allIssues.forEach(issue => {
      const org = issue.repository.owner.login
      const repoName = issue.repository.nameWithOwner

      if (!orgGroups[org]) orgGroups[org] = {}
      if (!orgGroups[org][repoName]) {
        orgGroups[org][repoName] = {
          id: issue.repository.id,
          name: issue.repository.name,
          nameWithOwner: repoName,
          viewerLogin: credentials.username,
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

    saveToCache(key, orgGroups)
    return orgGroups
  } catch (error) {
    if (error.message === 'Authentication failed') {
      clearCredentials()
      clearCache()
    }
    throw error
  }
}
