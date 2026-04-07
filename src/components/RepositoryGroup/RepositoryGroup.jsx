import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import IssueCard from '../IssueCard/IssueCard'
import { getPreferences, toggleCollapsed } from '../../utils/preferences'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { cn } from '@/lib/utils'

function RepositoryGroup({ repository, state = 'open', scope = 'me' }) {
  const { nameWithOwner, issues, viewerLogin } = repository
  const initiallyCollapsed = !!getPreferences().collapsed[nameWithOwner]
  const [collapsed, setCollapsed] = useState(initiallyCollapsed)

  const stateQ = state === 'closed' ? '+state%3Aclosed' : '+state%3Aopen'
  const userQ =
    scope === 'me' ? `+assignee%3A${viewerLogin}` :
    scope === 'relevant' ? `+involves%3A${viewerLogin}` :
    ''
  const issuesUrl = `https://github.com/${nameWithOwner}/issues?q=is%3Aissue${stateQ}${userQ}`

  const handleToggle = () => {
    toggleCollapsed(nameWithOwner)
    setCollapsed(c => !c)
  }

  return (
    <div className={collapsed ? 'h-auto' : 'h-[500px]'}>
      <Card className={cn("gap-0 py-0 h-full flex flex-col")}>
        <CardHeader className="flex-shrink-0 border-b px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggle}
              aria-expanded={!collapsed}
              aria-label={collapsed ? `Expand ${nameWithOwner}` : `Collapse ${nameWithOwner}`}
              className="flex-shrink-0 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", collapsed && "-rotate-90")} />
            </button>
            <CardTitle className="flex-1 min-w-0 text-sm">
              <a
                href={issuesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-primary truncate block transition-colors"
                title={`View ${state} issues in ${nameWithOwner} on GitHub`}
              >
                {nameWithOwner}
              </a>
            </CardTitle>
            <Badge variant="secondary" className="flex-shrink-0 tabular-nums">
              {issues.length}
            </Badge>
          </div>
        </CardHeader>
        {!collapsed && (
          <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-2 p-3">
                {issues.map(issue => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default RepositoryGroup
