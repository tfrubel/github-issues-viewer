import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchAllIssues } from '../../services/dataManager'
import { shouldRefreshData, cacheKey } from '../../utils/cache'
import { getPreferences, updatePreference } from '../../utils/preferences'
import IssueCard from '../IssueCard/IssueCard'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { Building2, GitBranch, User, RefreshCw, X, Info, LayoutGrid, List } from 'lucide-react'
import { Skeleton } from '../ui/skeleton'

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

const ALL_VALUE = '__all__'

function FilterDropdown({ icon: Icon, label, value, onChange, options }) {
  const hasValue = value !== ''
  const selectValue = value === '' ? ALL_VALUE : value
  const handleChange = (val) => onChange(val === ALL_VALUE ? '' : val)

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger
        className={`h-8 min-w-[130px] max-w-[200px] rounded-full text-sm pl-2.5 pr-2 gap-1.5 ${
          hasValue ? 'border-primary/60 bg-primary/5 text-foreground' : 'text-muted-foreground'
        }`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{label === 'Repository' ? 'All Repositories' : `All ${label}s`}</SelectItem>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

  const [filterOrg, setFilterOrg] = useState('')
  const [filterRepo, setFilterRepo] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const [viewMode, setViewMode] = useState(initialPrefs.viewMode)

  const PAGE_SIZE = 20
  const [openVisible, setOpenVisible] = useState(PAGE_SIZE)
  const [closedVisible, setClosedVisible] = useState(PAGE_SIZE)

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
    setFilterOrg('')
    setFilterRepo('')
    setFilterAuthor('')
  }

  const { allOpen, allClosed, orgOptions, repoOptions, authorOptions } = useMemo(() => {
    const allOpen = []
    const allClosed = []
    const orgSet = new Set()
    const repoMap = new Map()
    const authorMap = new Map()

    for (const [org, orgRepos] of Object.entries(orgData)) {
      orgSet.add(org)
      for (const [, repo] of Object.entries(orgRepos)) {
        repoMap.set(repo.nameWithOwner, { value: repo.nameWithOwner, label: repo.name, org })
        for (const issue of repo.open) {
          allOpen.push({ ...issue, _repoName: repo.name, _repoKey: repo.nameWithOwner, _org: org })
          if (issue.author?.login) authorMap.set(issue.author.login, true)
        }
        for (const issue of repo.closed) {
          allClosed.push({ ...issue, _repoName: repo.name, _repoKey: repo.nameWithOwner, _org: org })
          if (issue.author?.login) authorMap.set(issue.author.login, true)
        }
      }
    }

    const orgOptions = Array.from(orgSet).sort().map(o => ({ value: o, label: o }))
    const repoOptions = Array.from(repoMap.values()).sort((a, b) => a.label.localeCompare(b.label))
    const authorOptions = Array.from(authorMap.keys()).sort().map(a => ({ value: a, label: a }))

    return { allOpen, allClosed, orgOptions, repoOptions, authorOptions }
  }, [orgData])

  const filteredRepoOptions = useMemo(() => {
    if (!filterOrg) return repoOptions
    return repoOptions.filter(r => r.org === filterOrg)
  }, [repoOptions, filterOrg])

  const filteredOpen = useMemo(() =>
    allOpen.filter(issue => {
      if (filterOrg && issue._org !== filterOrg) return false
      if (filterRepo && issue._repoKey !== filterRepo) return false
      if (filterAuthor && issue.author?.login !== filterAuthor) return false
      return true
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOpen, filterOrg, filterRepo, filterAuthor]
  )

  const filteredClosed = useMemo(() =>
    allClosed.filter(issue => {
      if (filterOrg && issue._org !== filterOrg) return false
      if (filterRepo && issue._repoKey !== filterRepo) return false
      if (filterAuthor && issue.author?.login !== filterAuthor) return false
      return true
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allClosed, filterOrg, filterRepo, filterAuthor]
  )

  useEffect(() => {
    setOpenVisible(PAGE_SIZE)
    setClosedVisible(PAGE_SIZE)
  }, [filterOrg, filterRepo, filterAuthor, scope])

  const visibleOpen = useMemo(() => filteredOpen.slice(0, openVisible), [filteredOpen, openVisible])
  const visibleClosed = useMemo(() => filteredClosed.slice(0, closedVisible), [filteredClosed, closedVisible])

  const hasFilters = filterOrg || filterRepo || filterAuthor
  const canRefresh = shouldRefreshData(cacheKey(scope, 'both'))

  const handleOrgChange = (val) => {
    setFilterOrg(val)
    if (val && filterRepo) {
      const stillValid = repoOptions.find(r => r.value === filterRepo && r.org === val)
      if (!stillValid) setFilterRepo('')
    }
  }

  const totalRepos = repoOptions.length
  const totalOrgs = orgOptions.length

  const stats = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border mb-6">
      {[
        { label: 'Open', value: filteredOpen.length, accent: true },
        { label: 'Closed', value: filteredClosed.length },
        { label: 'Repositories', value: totalRepos },
        { label: 'Organizations', value: totalOrgs },
      ].map((s) => (
        <div key={s.label} className="bg-background px-5 py-4 flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</span>
          <span className={`font-display text-3xl font-light tabular-nums leading-none ${s.accent ? 'text-primary' : 'text-foreground'}`}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  )

  const controls = (
    <div className="flex flex-col items-center mb-5 px-4 space-y-3">
      {/* Scope */}
      <div className="flex justify-center">
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
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap justify-center items-center gap-2">
        <FilterDropdown
          icon={Building2}
          label="Organization"
          value={filterOrg}
          onChange={handleOrgChange}
          options={orgOptions}
        />
        <FilterDropdown
          icon={GitBranch}
          label="Repository"
          value={filterRepo}
          onChange={setFilterRepo}
          options={filteredRepoOptions}
        />
        <FilterDropdown
          icon={User}
          label="Creator"
          value={filterAuthor}
          onChange={setFilterAuthor}
          options={authorOptions}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterOrg(''); setFilterRepo(''); setFilterAuthor('') }}
            className="h-8 px-2.5 rounded-full text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="w-3 h-3" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Hint + timestamp */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{scopeHints[scope]}</span>
        {lastRefreshTime && !isLoading && (
          <span className="opacity-60">· {new Date(lastRefreshTime).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    const skeletonRows = Array.from({ length: 8 })
    return (
      <div>
        {controls}
        <div className="flex items-center justify-end gap-2 px-4 mb-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4 px-4">
          {[0, 1].map(col => (
            <div key={col} className="flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8 rounded-full" />
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-1 space-y-1">
                {skeletonRows.map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <Skeleton className="w-2 h-2 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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

  const listControls = (
    <div className="flex items-center justify-end gap-2 px-4 mb-3">
      <Button
        onClick={() => loadIssues({ forceFresh: true })}
        disabled={!canRefresh || isLoading}
        variant="outline"
        className="h-9 px-3 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
        title={canRefresh ? 'Refresh' : 'Please wait before refreshing again'}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {isLoading ? 'Loading…' : 'Refresh'}
      </Button>
      <div className="inline-flex rounded-md border border-border bg-muted overflow-hidden">
        <button
          onClick={() => { setViewMode('grid'); updatePreference({ viewMode: 'grid' }) }}
          className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          title="Grid view"
        >
          <LayoutGrid className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setViewMode('list'); updatePreference({ viewMode: 'list' }) }}
          className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          title="List view"
        >
          <List className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="px-4">
      {controls}
      <div className="px-0">{stats}</div>
      {listControls}
      <div className="grid grid-cols-2 gap-6">
        {/* Open Issues */}
        <section className="flex flex-col min-h-0">
          <div className="flex items-baseline justify-between mb-3 pb-3 border-b border-border">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">No. 01</span>
              <h3 className="font-display text-2xl font-normal italic text-foreground">Open</h3>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{filteredOpen.length} items</span>
          </div>
          <ScrollArea className="h-[calc(100vh-380px)] rounded-xl border border-border bg-muted/30">
            <div className={viewMode === 'list' ? 'p-1' : 'grid grid-cols-2 gap-2 p-2'}>
              {filteredOpen.length === 0 ? (
                <p className="text-muted-foreground text-sm py-12 text-center italic">Nothing open. A rare and quiet day.</p>
              ) : (
                visibleOpen.map(issue => (
                  <IssueCard key={issue.id} issue={issue} viewMode={viewMode} />
                ))
              )}
            </div>
            {filteredOpen.length > openVisible && (
              <div className="flex flex-col items-center gap-1.5 py-5 border-t border-border/60 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenVisible(v => v + PAGE_SIZE)}
                  className="h-8 px-4 rounded-full text-xs uppercase tracking-[0.16em] font-medium"
                >
                  Load more
                </Button>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                  {openVisible} of {filteredOpen.length}
                </span>
              </div>
            )}
          </ScrollArea>
        </section>

        {/* Closed Issues */}
        <section className="flex flex-col min-h-0">
          <div className="flex items-baseline justify-between mb-3 pb-3 border-b border-border">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">No. 02</span>
              <h3 className="font-display text-2xl font-normal italic text-muted-foreground">Closed</h3>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{filteredClosed.length} items</span>
          </div>
          <ScrollArea className="h-[calc(100vh-380px)] rounded-xl border border-border bg-muted/30">
            <div className={viewMode === 'list' ? 'p-1' : 'grid grid-cols-2 gap-2 p-2'}>
              {filteredClosed.length === 0 ? (
                <p className="text-muted-foreground text-sm py-12 text-center italic">No closed issues yet.</p>
              ) : (
                visibleClosed.map(issue => (
                  <IssueCard key={issue.id} issue={issue} viewMode={viewMode} />
                ))
              )}
            </div>
            {filteredClosed.length > closedVisible && (
              <div className="flex flex-col items-center gap-1.5 py-5 border-t border-border/60 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClosedVisible(v => v + PAGE_SIZE)}
                  className="h-8 px-4 rounded-full text-xs uppercase tracking-[0.16em] font-medium"
                >
                  Load more
                </Button>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                  {closedVisible} of {filteredClosed.length}
                </span>
              </div>
            )}
          </ScrollArea>
        </section>
      </div>
    </div>
  )
}

export default IssueList
