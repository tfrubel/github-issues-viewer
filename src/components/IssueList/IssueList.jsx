import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { fetchAllIssues, fetchMoreIssuesPage, mergeIssuesIntoOrgData } from '../../services/dataManager'
import { getCredentials } from '../../utils/localStorage'
import { shouldRefreshData, cacheKey } from '../../utils/cache'
import { getPreferences, updatePreference } from '../../utils/preferences'
import IssueCard from '../IssueCard/IssueCard'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover'
import { Checkbox } from '../ui/checkbox'
import { Building2, GitBranch, User, RefreshCw, X, Info, LayoutGrid, List, ChevronDown } from 'lucide-react'
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

function MultiFilterDropdown({ icon: Icon, label, values, onChange, options }) {
  const [open, setOpen] = useState(false)
  const hasValues = values.length > 0

  const toggleValue = (val) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  const displayText = useMemo(() => {
    if (values.length === 0) return null
    if (values.length === 1) return options.find(o => o.value === values[0])?.label ?? values[0]
    return `${values.length} selected`
  }, [values, options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            hasValues
              ? 'border-primary/60 bg-primary/5 text-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-muted'
          }`}
          style={{ minWidth: '130px', maxWidth: '200px' }}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left truncate">{displayText ?? label}</span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 max-h-72 overflow-y-auto">
        {options.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground text-center">No options</p>
        ) : (
          options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleValue(opt.value)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent cursor-pointer transition-colors text-left"
            >
              <Checkbox
                checked={values.includes(opt.value)}
                onCheckedChange={() => toggleValue(opt.value)}
                onClick={e => e.stopPropagation()}
              />
              <span className="truncate">{opt.label}</span>
            </button>
          ))
        )}
        {hasValues && (
          <div className="mt-1 border-t border-border pt-1">
            <button
              onClick={() => onChange([])}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
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
  const [baseOrgData, setBaseOrgData] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefreshTime, setLastRefreshTime] = useState(null)

  const [filterOrgs, setFilterOrgs] = useState(initialPrefs.filters.orgs)
  const [filterRepos, setFilterRepos] = useState(initialPrefs.filters.repos)
  const [filterAuthors, setFilterAuthors] = useState(initialPrefs.filters.authors)
  const [viewMode, setViewMode] = useState(initialPrefs.viewMode)

  // Persist filter changes to localStorage
  const persistFilters = useCallback((orgs, repos, authors) => {
    updatePreference({ filters: { orgs, repos, authors } })
  }, [])

  const handleFilterOrgsChange = useCallback((val) => {
    setFilterOrgs(val)
    // When orgs change, drop repos that no longer belong to selected orgs
    setFilterRepos(prev => {
      if (val.length === 0) {
        persistFilters(val, prev, filterAuthors)
        return prev
      }
      const filtered = prev.filter(r => {
        const org = r.split('/')[0]
        return val.includes(org)
      })
      persistFilters(val, filtered, filterAuthors)
      return filtered
    })
  }, [filterAuthors, persistFilters])

  const handleFilterReposChange = useCallback((val) => {
    setFilterRepos(val)
    persistFilters(filterOrgs, val, filterAuthors)
  }, [filterOrgs, filterAuthors, persistFilters])

  const handleFilterAuthorsChange = useCallback((val) => {
    setFilterAuthors(val)
    persistFilters(filterOrgs, filterRepos, val)
  }, [filterOrgs, filterRepos, persistFilters])

  const PAGE_SIZE = 50
  const [openPageInfo, setOpenPageInfo] = useState({ hasNextPage: false, endCursor: null })
  const [closedPageInfo, setClosedPageInfo] = useState({ hasNextPage: false, endCursor: null })
  const [loadingMoreOpen, setLoadingMoreOpen] = useState(false)
  const [loadingMoreClosed, setLoadingMoreClosed] = useState(false)

  // Use a ref to always hold latest filter values without stale closure issues in loadIssues
  const filtersRef = useRef({ orgs: filterOrgs, repos: filterRepos, authors: filterAuthors })
  useEffect(() => {
    filtersRef.current = { orgs: filterOrgs, repos: filterRepos, authors: filterAuthors }
  }, [filterOrgs, filterRepos, filterAuthors])

  const loadIssues = useCallback(async (opts = {}) => {
    const {
      forceFresh = false,
      scope: s = scope,
      filters = filtersRef.current,
    } = opts
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchAllIssues({ scope: s, forceFresh, filters })
      setOrgData(data.orgGroups)
      const noFilters = !filters.orgs?.length && !filters.repos?.length && !filters.authors?.length
      if (noFilters) {
        setBaseOrgData(data.orgGroups)
      } else {
        // Always refresh base options for the current scope by fetching the unfiltered view
        // (cached, so usually free). This keeps filter dropdowns showing the full set of
        // orgs/repos/authors available in the active tab.
        try {
          const baseData = await fetchAllIssues({ scope: s, forceFresh: false, filters: {} })
          setBaseOrgData(baseData.orgGroups)
        } catch {
          setBaseOrgData(prev => (Object.keys(prev).length ? prev : data.orgGroups))
        }
      }
      setOpenPageInfo(data.openPageInfo || { hasNextPage: false, endCursor: null })
      setClosedPageInfo(data.closedPageInfo || { hasNextPage: false, endCursor: null })
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
    loadIssues({ scope, filters: { orgs: filterOrgs, repos: filterRepos, authors: filterAuthors } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, filterOrgs, filterRepos, filterAuthors])

  const handleScopeChange = (val) => {
    updatePreference({ scope: val })
    setScope(val)
    // Reset baseOrgData so the next fetch repopulates option lists for the new scope.
    // Filters are intentionally preserved; a separate effect prunes any that no longer apply.
    setBaseOrgData({})
  }

  // Prune filters to values still present in the current scope's data.
  useEffect(() => {
    if (!Object.keys(baseOrgData).length) return
    const orgSet = new Set()
    const repoSet = new Set()
    const authorSet = new Set()
    for (const [org, orgRepos] of Object.entries(baseOrgData)) {
      orgSet.add(org)
      for (const [, repo] of Object.entries(orgRepos)) {
        repoSet.add(repo.nameWithOwner)
        for (const issue of repo.open) if (issue.author?.login) authorSet.add(issue.author.login)
        for (const issue of repo.closed) if (issue.author?.login) authorSet.add(issue.author.login)
      }
    }
    const nextOrgs = filterOrgs.filter(o => orgSet.has(o))
    const nextRepos = filterRepos.filter(r => repoSet.has(r))
    const nextAuthors = filterAuthors.filter(a => authorSet.has(a))
    const changed =
      nextOrgs.length !== filterOrgs.length ||
      nextRepos.length !== filterRepos.length ||
      nextAuthors.length !== filterAuthors.length
    if (changed) {
      setFilterOrgs(nextOrgs)
      setFilterRepos(nextRepos)
      setFilterAuthors(nextAuthors)
      updatePreference({ filters: { orgs: nextOrgs, repos: nextRepos, authors: nextAuthors } })
    }
  }, [baseOrgData, filterOrgs, filterRepos, filterAuthors])

  const { allOpen, allClosed } = useMemo(() => {
    const allOpen = []
    const allClosed = []
    for (const [org, orgRepos] of Object.entries(orgData)) {
      for (const [, repo] of Object.entries(orgRepos)) {
        for (const issue of repo.open) {
          allOpen.push({ ...issue, _repoName: repo.name, _repoKey: repo.nameWithOwner, _org: org })
        }
        for (const issue of repo.closed) {
          allClosed.push({ ...issue, _repoName: repo.name, _repoKey: repo.nameWithOwner, _org: org })
        }
      }
    }
    return { allOpen, allClosed }
  }, [orgData])

  const { orgOptions, repoOptions, authorOptions } = useMemo(() => {
    const orgSet = new Set()
    const repoMap = new Map()
    const authorMap = new Map()
    for (const [org, orgRepos] of Object.entries(baseOrgData)) {
      orgSet.add(org)
      for (const [, repo] of Object.entries(orgRepos)) {
        repoMap.set(repo.nameWithOwner, { value: repo.nameWithOwner, label: repo.name, org })
        for (const issue of repo.open) {
          if (issue.author?.login) authorMap.set(issue.author.login, true)
        }
        for (const issue of repo.closed) {
          if (issue.author?.login) authorMap.set(issue.author.login, true)
        }
      }
    }
    const orgOptions = Array.from(orgSet).sort().map(o => ({ value: o, label: o }))
    const repoOptions = Array.from(repoMap.values()).sort((a, b) => a.label.localeCompare(b.label))
    const authorOptions = Array.from(authorMap.keys()).sort().map(a => ({ value: a, label: a }))
    return { orgOptions, repoOptions, authorOptions }
  }, [baseOrgData])

  const filteredRepoOptions = useMemo(() => {
    if (filterOrgs.length === 0) return repoOptions
    return repoOptions.filter(r => filterOrgs.includes(r.org))
  }, [repoOptions, filterOrgs])

  const filteredOpen = useMemo(() =>
    allOpen.filter(issue => {
      if (filterOrgs.length > 0 && !filterOrgs.includes(issue._org)) return false
      if (filterRepos.length > 0 && !filterRepos.includes(issue._repoKey)) return false
      if (filterAuthors.length > 0 && !filterAuthors.includes(issue.author?.login)) return false
      return true
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOpen, filterOrgs, filterRepos, filterAuthors]
  )

  const filteredClosed = useMemo(() =>
    allClosed.filter(issue => {
      if (filterOrgs.length > 0 && !filterOrgs.includes(issue._org)) return false
      if (filterRepos.length > 0 && !filterRepos.includes(issue._repoKey)) return false
      if (filterAuthors.length > 0 && !filterAuthors.includes(issue.author?.login)) return false
      return true
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allClosed, filterOrgs, filterRepos, filterAuthors]
  )

  const handleLoadMore = useCallback(async (state) => {
    const pageInfo = state === 'open' ? openPageInfo : closedPageInfo
    if (!pageInfo.hasNextPage) return
    const setLoading = state === 'open' ? setLoadingMoreOpen : setLoadingMoreClosed
    const setPageInfo = state === 'open' ? setOpenPageInfo : setClosedPageInfo
    try {
      setLoading(true)
      const { nodes, pageInfo: nextPageInfo } = await fetchMoreIssuesPage({
        scope,
        state,
        after: pageInfo.endCursor,
        first: PAGE_SIZE,
        filters: filtersRef.current,
      })
      const creds = getCredentials()
      setOrgData(prev => mergeIssuesIntoOrgData(prev, nodes, creds?.username))
      setPageInfo(nextPageInfo || { hasNextPage: false, endCursor: null })
    } catch (err) {
      setError(err.message)
      if (err.message === 'Authentication failed' || err.message === 'No credentials found') {
        onAuthFailure()
      }
    } finally {
      setLoading(false)
    }
  }, [scope, openPageInfo, closedPageInfo, onAuthFailure])

  const hasFilters = filterOrgs.length > 0 || filterRepos.length > 0 || filterAuthors.length > 0
  const canRefresh = shouldRefreshData(cacheKey(scope, 'both'))

  const clearAllFilters = useCallback(() => {
    setFilterOrgs([])
    setFilterRepos([])
    setFilterAuthors([])
    updatePreference({ filters: { orgs: [], repos: [], authors: [] } })
  }, [])

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
        <MultiFilterDropdown
          icon={Building2}
          label="Organization"
          values={filterOrgs}
          onChange={handleFilterOrgsChange}
          options={orgOptions}
        />
        <MultiFilterDropdown
          icon={GitBranch}
          label="Repository"
          values={filterRepos}
          onChange={handleFilterReposChange}
          options={filteredRepoOptions}
        />
        <MultiFilterDropdown
          icon={User}
          label="Creator"
          values={filterAuthors}
          onChange={handleFilterAuthorsChange}
          options={authorOptions}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
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
            <span className="text-xs text-muted-foreground tabular-nums">{filteredOpen.length} loaded{openPageInfo.hasNextPage ? '+' : ''}</span>
          </div>
          <ScrollArea className="h-[calc(100vh-380px)] rounded-xl border border-border bg-muted/30">
            <div className={viewMode === 'list' ? 'p-1' : 'grid grid-cols-2 gap-2 p-2'}>
              {filteredOpen.length === 0 ? (
                <p className="text-muted-foreground text-sm py-12 text-center italic">Nothing open. A rare and quiet day.</p>
              ) : (
                filteredOpen.map(issue => (
                  <IssueCard key={issue.id} issue={issue} viewMode={viewMode} />
                ))
              )}
            </div>
            {openPageInfo.hasNextPage && (
              <div className="flex flex-col items-center gap-1.5 py-5 border-t border-border/60 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadMore('open')}
                  disabled={loadingMoreOpen}
                  className="h-8 px-4 rounded-full text-xs uppercase tracking-[0.16em] font-medium"
                >
                  {loadingMoreOpen ? 'Loading…' : 'Load more'}
                </Button>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                  {allOpen.length} loaded
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
            <span className="text-xs text-muted-foreground tabular-nums">{filteredClosed.length} loaded{closedPageInfo.hasNextPage ? '+' : ''}</span>
          </div>
          <ScrollArea className="h-[calc(100vh-380px)] rounded-xl border border-border bg-muted/30">
            <div className={viewMode === 'list' ? 'p-1' : 'grid grid-cols-2 gap-2 p-2'}>
              {filteredClosed.length === 0 ? (
                <p className="text-muted-foreground text-sm py-12 text-center italic">No closed issues yet.</p>
              ) : (
                filteredClosed.map(issue => (
                  <IssueCard key={issue.id} issue={issue} viewMode={viewMode} />
                ))
              )}
            </div>
            {closedPageInfo.hasNextPage && (
              <div className="flex flex-col items-center gap-1.5 py-5 border-t border-border/60 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadMore('closed')}
                  disabled={loadingMoreClosed}
                  className="h-8 px-4 rounded-full text-xs uppercase tracking-[0.16em] font-medium"
                >
                  {loadingMoreClosed ? 'Loading…' : 'Load more'}
                </Button>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                  {allClosed.length} loaded
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
