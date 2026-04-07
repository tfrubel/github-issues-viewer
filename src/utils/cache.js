const CACHE_PREFIX = 'github_issues_cache_'
const RATE_LIMIT_SECONDS = 30

export const cacheKey = (scope, state) => `${CACHE_PREFIX}${scope}_${state}`

export const saveToCache = (key, issues) => {
  const cache = {
    timestamp: new Date().getTime(),
    data: issues
  }
  sessionStorage.setItem(key, JSON.stringify(cache))
}

export const getFromCache = (key) => {
  const cache = sessionStorage.getItem(key)
  if (!cache) return null
  return JSON.parse(cache)
}

export const clearCache = () => {
  Object.keys(sessionStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => sessionStorage.removeItem(k))
}

export const shouldRefreshData = (key) => {
  const cache = getFromCache(key)
  if (!cache || !cache.timestamp) return true

  const now = new Date().getTime()
  const timeSinceLastRefresh = (now - cache.timestamp) / 1000
  return timeSinceLastRefresh >= RATE_LIMIT_SECONDS
}
