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
