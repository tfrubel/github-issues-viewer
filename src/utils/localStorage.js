const COOKIE_USERNAME = 'gh_username'
const COOKIE_PAT = 'gh_pat'
const EXPIRES_DAYS = 30

const setCookie = (name, value, days) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`
}

const getCookie = (name) => {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict`
}

export const saveCredentials = (username, pat) => {
  setCookie(COOKIE_USERNAME, username, EXPIRES_DAYS)
  setCookie(COOKIE_PAT, pat, EXPIRES_DAYS)
}

export const getCredentials = () => {
  const username = getCookie(COOKIE_USERNAME)
  const pat = getCookie(COOKIE_PAT)
  if (!username || !pat) return null
  return { username, pat }
}

export const clearCredentials = () => {
  deleteCookie(COOKIE_USERNAME)
  deleteCookie(COOKIE_PAT)
}

export const hasValidCredentials = () => {
  const credentials = getCredentials()
  return credentials !== null && credentials.username && credentials.pat
}
