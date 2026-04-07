import { useState, useEffect, useCallback } from 'react'
import { fetchIssues } from '../../services/dataManager'
import { shouldRefreshData, cacheKey } from '../../utils/cache'
import { getPreferences, updatePreference } from '../../utils/preferences'
import RepositoryGroup from '../RepositoryGroup/RepositoryGroup'

function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex p-1 bg-gray-100 rounded-full border border-gray-200"
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function IssueList({ onAuthFailure }) {
  const initialPrefs = getPreferences()
  const [scope, setScope] = useState(initialPrefs.scope)
  const [state, setState] = useState(initialPrefs.state)
  const [repositories, setRepositories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshTime, setLastRefreshTime] = useState(null)

  const loadIssues = useCallback(async (opts = {}) => {
    const { forceFresh = false, scope: s = scope, state: st = state } = opts
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchIssues({ scope: s, state: st, forceFresh })
      setRepositories(data)
      setLastRefreshTime(new Date().getTime())
    } catch (err) {
      setError(err.message)
      if (err.message === 'Authentication failed' || err.message === 'No credentials found') {
        onAuthFailure()
      }
    } finally {
      setIsLoading(false)
    }
  }, [scope, state, onAuthFailure])

  useEffect(() => {
    loadIssues({ scope, state })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, state])

  const handleScopeChange = (val) => {
    updatePreference({ scope: val })
    setScope(val)
  }

  const handleStateChange = (val) => {
    updatePreference({ state: val })
    setState(val)
  }

  const canRefresh = shouldRefreshData(cacheKey(scope, state))

  const scopeHints = {
    me: 'Issues assigned to you across all repositories.',
    relevant: 'Issues you authored, are assigned to, were mentioned in, or commented on.',
    all: 'Every issue in your 30 most recently active repositories (owner, collaborator, or org member).',
  }

  return (
    <div>
      <div className="flex flex-col items-center mb-6 px-4 space-y-3">
        <div className="flex flex-wrap justify-center items-center gap-3">
          <SegmentedControl
            ariaLabel="Assignee scope"
            value={scope}
            onChange={handleScopeChange}
            options={[
              { value: 'me', label: 'Assigned to me' },
              { value: 'relevant', label: 'Relevant' },
              { value: 'all', label: 'All' },
            ]}
          />
          <SegmentedControl
            ariaLabel="Issue state"
            value={state}
            onChange={handleStateChange}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <button
            onClick={() => loadIssues({ forceFresh: true })}
            disabled={!canRefresh || isLoading}
            className="px-4 py-1.5 text-sm font-medium rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title={canRefresh ? 'Refresh' : 'Please wait before refreshing again'}
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-400" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10A8 8 0 11.999 9.999 8 8 0 0118 10zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>{scopeHints[scope]}</span>
        </div>
        <div className="text-[11px] text-gray-400 h-4">
          {lastRefreshTime && !isLoading && (
            <span>Last updated: {new Date(lastRefreshTime).toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-gray-600">Loading issues…</div>
        </div>
      ) : error ? (
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : repositories.length === 0 ? (
        <div className="text-center text-gray-600 py-10">
          No issues found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mx-[-1rem] px-4">
          {repositories.map(repo => (
            <RepositoryGroup key={repo.id} repository={repo} state={state} scope={scope} />
          ))}
        </div>
      )}
    </div>
  )
}

export default IssueList
