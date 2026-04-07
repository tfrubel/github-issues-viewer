import axios from 'axios'

const GITHUB_API = 'https://api.github.com/graphql'

const createGitHubClient = (pat) => {
  return axios.create({
    baseURL: GITHUB_API,
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
    }
  })
}

export const validateCredentials = async (username, pat) => {
  try {
    const client = createGitHubClient(pat)
    const query = `
      query ValidateUser($username: String!) {
        user(login: $username) {
          login
        }
      }
    `

    const response = await client.post('', {
      query,
      variables: { username }
    })

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message)
    }

    const user = response.data.data.user
    if (!user || user.login.toLowerCase() !== username.toLowerCase()) {
      throw new Error('Invalid username')
    }

    return true
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid Personal Access Token')
    }
    throw error
  }
}

export const fetchUserIssues = async (pat, username, { state = 'open', scope = 'me' } = {}) => {
  try {
    const client = createGitHubClient(pat)
    const stateQ = state === 'closed' ? 'is:closed' : 'is:open'
    // "Only Me" => issues assigned to user. "All" => any issue the user is involved in
    // (author, assignee, mentioned, commenter). This keeps the result set scoped and
    // avoids hammering the GraphQL search API.
    const scopeQ = scope === 'all' ? `involves:${username}` : `assignee:${username}`
    const searchQuery = `is:issue ${stateQ} ${scopeQ} -archived:true`

    const query = `
      query Search($q: String!) {
        search(query: $q, type: ISSUE, first: 100) {
          nodes {
            ... on Issue {
              id
              title
              body
              url
              state
              createdAt
              labels(first: 10) {
                nodes {
                  id
                  name
                  color
                }
              }
              repository {
                id
                nameWithOwner
                name
                url
                owner {
                  login
                }
              }
            }
          }
        }
      }
    `

    const response = await client.post('', { query, variables: { q: searchQuery } })

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message)
    }

    return response.data.data
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please ensure you are using a Classic PAT with the repo scope enabled.')
    }
    throw error
  }
}
