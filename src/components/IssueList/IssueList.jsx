import { useState, useEffect, useCallback } from 'react'
import { fetchAllIssues } from '../../services/dataManager'
import { shouldRefreshData, cacheKey } from '../../utils/cache'
import { getPreferences, updatePreference } from '../../utils/preferences'
import IssueCard from '../IssueCard/IssueCard'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { ChevronLeft } from 'lucide-react'

function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex p-1 bg-muted rounded-full border border-border"
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
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function OrgCard({ org, repos, onSelect }) {
  const repoList = Object.values(repos)
  const totalOpen = repoList.reduce((sum, r) => sum + r.open.length, 0)
  const totalClosed = repoList.reduce((sum, r) => sum + r.closed.length, 0)

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
      onClick={() => onSelect(org)}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground text-base mb-3 truncate" title={org}>{org}</h3>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Repositories</span>
            <Badge variant="secondary">{repoList.length}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Open</span>
            <Badge variant="outline" className="border-primary/40 text-primary">{totalOpen}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Closed</span>
            <Badge variant="secondary">{totalClosed}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RepoCard({ repo, onSelect }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
      onClick={() => onSelect(repo.nameWithOwner)}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground text-sm mb-3 truncate" title={repo.nameWithOwner}>
          {repo.name}
        </h3>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span className="text-muted-foreground">Open</span>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary tabular-nums h-4 px-1.5">
              {repo.open.length}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-muted-foreground">Closed</span>
            </div>
            <Badge variant="secondary" className="tabular-nums h-4 px-1.5">
              {repo.closed.length}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const scopeHints = {
  me: 'Issues assigned to you across all repositories.',
  relevant: 'Issues you authored, are assigned to, were mentioned in, or commented on.',
  all: 'Every issue in your 30 most recently active repositories.',
}

function IssueList({ onAuthFailure }) {
  const initialPrefs = getPreferences()
  const [scope, setScope] = useState(initialPrefs.scope)
  const [orgData, setOrgData] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshTime, setLastRefreshTime] = useState(null)

  // Navigation state
  const [view, setView] = useState('dashboard') // 'dashboard' | 'repos' | 'issues'
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [selectedRepoKey, setSelectedRepoKey] = useState(null)

  const loadIssues = useCallback(async (opts = {}) => {
    const { forceFresh = false, scope: s = scope } = opts
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchAllIssues({ scope: s, forceFresh })
      setOrgData(data)
      setLastRefreshTime(new Date().getTime())
    } catch (err) {
      setError(err.message)
      if (err.message === 'Authentication failed' || err.message === 'No credentials found') {
        onAuthFailure()
      }
    } finally {
      setIsLoading(false)
    }
  }, [scope, onAuthFailure])

  useEffect(() => {
    loadIssues({ scope })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  const handleScopeChange = (val) => {
    updatePreference({ scope: val })
    setScope(val)
    setView('dashboard')
    setSelectedOrg(null)
    setSelectedRepoKey(null)
  }

  const handleOrgSelect = (org) => {
    setSelectedOrg(org)
    setView('repos')
  }

  const handleRepoSelect = (repoKey) => {
    setSelectedRepoKey(repoKey)
    setView('issues')
  }

  const canRefresh = shouldRefreshData(cacheKey(scope, 'both'))
  const sortedOrgs = Object.keys(orgData).sort()

  const controls = (
    <div className="flex flex-col items-center mb-6 px-4 space-y-2">
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
        <Button
          onClick={() => loadIssues({ forceFresh: true })}
          disabled={!canRefresh || isLoading}
          variant="outline"
          className="px-4 py-1.5 text-sm font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          title={canRefresh ? 'Refresh' : 'Please wait before refreshing again'}
        >
          {isLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10A8 8 0 11.999 9.999 8 8 0 0118 10zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>{scopeHints[scope]}</span>
      </div>
      <div className="text-[11px] text-muted-foreground h-4">
        {lastRefreshTime && !isLoading && (
          <span>Last updated: {new Date(lastRefreshTime).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div>
        {controls}
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-muted-foreground">Loading issues…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        {controls}
        <div className="max-w-2xl mx-auto bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (sortedOrgs.length === 0) {
    return (
      <div>
        {controls}
        <div className="text-center text-muted-foreground py-10">No issues found</div>
      </div>
    )
  }

  // Screen 1 — Dashboard: grid of org/owner cards
  if (view === 'dashboard') {
    return (
      <div>
        {controls}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-4">
          {sortedOrgs.map(org => (
            <OrgCard key={org} org={org} repos={orgData[org]} onSelect={handleOrgSelect} />
          ))}
        </div>
      </div>
    )
  }

  // Screen 2 — Repos: grid of repository cards for selected org
  if (view === 'repos') {
    const repos = orgData[selectedOrg] || {}
    const sortedRepos = Object.values(repos).sort((a, b) =>
      a.nameWithOwner.localeCompare(b.nameWithOwner)
    )

    return (
      <div>
        {controls}
        <div className="flex items-center gap-1.5 mb-4 px-4 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setView('dashboard'); setSelectedOrg(null) }}
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">{selectedOrg}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-4">
          {sortedRepos.map(repo => (
            <RepoCard key={repo.nameWithOwner} repo={repo} onSelect={handleRepoSelect} />
          ))}
        </div>
      </div>
    )
  }

  // Screen 3 — Issues: two-column open/closed for selected repo
  if (view === 'issues') {
    const repo = orgData[selectedOrg]?.[selectedRepoKey]
    if (!repo) return null

    return (
      <div>
        {controls}
        <div className="flex items-center gap-1.5 mb-4 px-4 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setView('dashboard'); setSelectedOrg(null); setSelectedRepoKey(null) }}
            className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </Button>
          <span className="text-muted-foreground">/</span>
          <button
            onClick={() => { setView('repos'); setSelectedRepoKey(null) }}
            className="text-muted-foreground hover:text-foreground font-medium"
          >
            {selectedOrg}
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">{repo.name}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 px-4">
          {/* Open Issues */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
              <h3 className="font-semibold text-foreground">Open Issues</h3>
              <Badge variant="outline" className="border-primary/40 text-primary tabular-nums">
                {repo.open.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-320px)] rounded-lg border border-border bg-muted/30">
              <div className="space-y-2 p-2">
                {repo.open.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No open issues</p>
                ) : (
                  repo.open.map(issue => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Closed Issues */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <h3 className="font-semibold text-foreground">Closed Issues</h3>
              <Badge variant="secondary" className="tabular-nums">
                {repo.closed.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-320px)] rounded-lg border border-border bg-muted/30">
              <div className="space-y-2 p-2">
                {repo.closed.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No closed issues</p>
                ) : (
                  repo.closed.map(issue => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default IssueList
