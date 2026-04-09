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

// Fetch the most recently active repositories the viewer has access to.
// Used to scope the "All" tab without scanning every repo on GitHub.
const fetchViewerRepos = async (client, limit = 30) => {
  const query = `
    query ViewerRepos($first: Int!) {
      viewer {
        repositories(
          first: $first,
          orderBy: { field: PUSHED_AT, direction: DESC },
          ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER],
          isArchived: false
        ) {
          nodes { nameWithOwner }
        }
      }
    }
  `
  const response = await client.post('', { query, variables: { first: limit } })
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message)
  }
  return response.data.data.viewer.repositories.nodes.map(r => r.nameWithOwner)
}

export const fetchUserIssues = async (pat, username, { state = 'open', scope = 'me', first = 50, after = null, filters = {} } = {}) => {
  try {
    const client = createGitHubClient(pat)
    const stateQ = state === 'closed' ? 'is:closed' : 'is:open'
    const { org: filterOrg, repo: filterRepo, author: filterAuthor } = filters

    // Scope mapping:
    //   'me'       => assignee:<user>     (Assigned to me)
    //   'relevant' => involves:<user>     (author, assignee, mentioned, commenter)
    //   'all'      => every issue in the repos the viewer has access to
    let searchQuery
    if (scope === 'all') {
      // If filterRepo or filterOrg is set, narrow directly instead of expanding viewer repos.
      if (filterRepo) {
        searchQuery = `is:issue ${stateQ} repo:${filterRepo} -archived:true`
      } else if (filterOrg) {
        searchQuery = `is:issue ${stateQ} user:${filterOrg} -archived:true`
      } else {
        const repos = await fetchViewerRepos(client, 30)
        if (repos.length === 0) {
          return { search: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } }
        }
        const repoQ = repos.map(r => `repo:${r}`).join(' ')
        searchQuery = `is:issue ${stateQ} ${repoQ} -archived:true`
      }
    } else {
      const scopeQ = scope === 'relevant' ? `involves:${username}` : `assignee:${username}`
      const parts = [`is:issue`, stateQ, scopeQ]
      if (filterRepo) parts.push(`repo:${filterRepo}`)
      else if (filterOrg) parts.push(`user:${filterOrg}`)
      parts.push('-archived:true')
      searchQuery = parts.join(' ')
    }
    if (filterAuthor) {
      searchQuery += ` author:${filterAuthor}`
    }
    searchQuery = searchQuery.replace(/\s+/g, ' ').trim()

    const query = `
      query Search($q: String!, $first: Int!, $after: String) {
        search(query: $q, type: ISSUE, first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            ... on Issue {
              id
              title
              body
              url
              state
              createdAt
              author {
                login
              }
              labels(first: 10) {
                nodes {
                  id
                  name
                  color
                }
              }
              comments(first: 20) {
                totalCount
                nodes {
                  id
                  body
                  createdAt
                  url
                  author {
                    login
                  }
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

    const response = await client.post('', { query, variables: { q: searchQuery, first, after } })

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
