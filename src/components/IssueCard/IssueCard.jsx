import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { cn } from '@/lib/utils'

function IssueCard({ issue }) {
  const [expanded, setExpanded] = useState(false)
  const { title, body, url, createdAt, labels, state } = issue
  const isClosed = state === 'CLOSED'
  const hasBody = !!(body && body.trim())

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setExpanded(v => !v)
  }

  return (
    <Card size="sm" className="gap-0 py-0 shadow-xs hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 block"
          >
            <h3 className={cn(
              "text-sm font-medium mb-2 break-words hover:text-primary transition-colors",
              !expanded && "line-clamp-2",
              isClosed && "text-muted-foreground"
            )}>
              {title}
            </h3>
          </a>
          {hasBody && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse description' : 'Expand description'}
              className="flex-shrink-0 mt-0.5 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", expanded && "rotate-180")} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <span>{formattedDate}</span>
            {isClosed && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide h-4 px-1.5">
                Closed
              </Badge>
            )}
          </div>
          {labels.nodes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {labels.nodes.map(label => (
                <span
                  key={label.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium truncate max-w-[120px]"
                  style={{
                    backgroundColor: `#${label.color}`,
                    color: parseInt(label.color, 16) > 0xffffff / 2 ? '#000' : '#fff'
                  }}
                  title={label.name}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {expanded && hasBody && (
          <>
            <Separator className="my-3" />
            <ScrollArea className="max-h-64">
              <div className="text-xs text-foreground/70 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed pr-3">
                {body}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default IssueCard
