import ReactMarkdown from 'react-markdown'
import { ExternalLink, FileText, GitBranch } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { cn } from '@/lib/utils'

function labelTextColor(hex) {
  return parseInt(hex, 16) > 0xffffff / 2 ? '#000' : '#fff'
}

function IssueDialog({ url, title, formattedDate, author, isClosed, labels, body, children }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
            >
              {title}
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
            </a>
          </DialogTitle>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span>{formattedDate}</span>
            {author && (
              <span className="inline-flex items-center gap-1">
                <img
                  src={`https://github.com/${author.login}.png?size=16`}
                  alt={author.login}
                  className="w-3.5 h-3.5 rounded-full"
                />
                <span>{author.login}</span>
              </span>
            )}
            {isClosed && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide h-4 px-1.5">
                Closed
              </Badge>
            )}
            {labels.nodes.map(label => (
              <span
                key={label.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: `#${label.color}`, color: labelTextColor(label.color) }}
              >
                {label.name}
              </span>
            ))}
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 [&_[data-slot=scroll-area-viewport]]:max-h-[calc(80vh-8rem)]">
          <div className="px-5 py-4 text-sm text-foreground/80 leading-relaxed
            prose prose-sm max-w-none
            [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4
            [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
            [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1 [&_h3]:mt-3
            [&_h4]:text-sm [&_h4]:font-medium [&_h4]:mb-1
            [&_h5]:text-xs [&_h5]:font-medium [&_h6]:text-xs
            [&_p]:mb-3
            [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc
            [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal
            [&_li]:mb-1
            [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
            [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:text-xs
            [&_pre_code]:bg-transparent [&_pre_code]:p-0
            [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:mb-3
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
            [&_hr]:border-border [&_hr]:my-4
            [&_img]:max-w-full [&_img]:rounded
            [&_table]:w-full [&_table]:text-xs [&_table]:mb-3
            [&_th]:text-left [&_th]:font-medium [&_th]:border-b [&_th]:border-border [&_th]:pb-1 [&_th]:pr-3
            [&_td]:border-b [&_td]:border-border/50 [&_td]:py-1 [&_td]:pr-3 content">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function IssueCard({ issue, viewMode = 'grid' }) {
  const { title, body, url, createdAt, labels, state, author, _repoKey } = issue
  const isClosed = state === 'CLOSED'
  const hasBody = !!(body && body.trim())

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // ── List row (2-row layout) ───────────────────────────────────────────────
  if (viewMode === 'list') {
    const row = (
      <div
        className={cn(
          'flex gap-2.5 px-2.5 py-2 rounded-none border-b border-border/50 last:border-0 transition-colors group',
          hasBody ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/30'
        )}
      >
        {/* State dot — aligned to first row */}
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0 mt-[5px]',
            isClosed ? 'bg-muted-foreground/40' : 'bg-primary'
          )}
        />

        {/* Content: two rows */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Row 1: title + action icons */}
          <div className="flex items-start gap-2">
            <span
              className={cn(
                'text-[15px] font-medium break-words line-clamp-2 flex-1 min-w-0',
                isClosed && 'text-muted-foreground'
              )}
              title={title}
            >
              {title}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {hasBody && (
                <FileText className="w-3.5 h-3.5 text-muted-foreground/40" title="Has description" />
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-muted-foreground/40 hover:text-foreground transition-colors"
                title="Open on GitHub"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Row 2: repo · labels · author · date */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground/70">
            {_repoKey && (
              <span className="inline-flex items-center gap-1 shrink-0" title={_repoKey}>
                <GitBranch className="w-3 h-3 opacity-60 shrink-0" />
                <span className="truncate max-w-[140px]">{_repoKey}</span>
              </span>
            )}
            {labels.nodes.length > 0 && (
              <span className="w-px h-3 bg-border/60 shrink-0" />
            )}
            {labels.nodes.map(label => (
              <span
                key={label.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                style={{ backgroundColor: `#${label.color}`, color: labelTextColor(label.color) }}
                title={label.name}
              >
                {label.name}
              </span>
            ))}
            {author && (
              <>
                <span className="w-px h-3 bg-border/60 shrink-0" />
                <span className="inline-flex items-center gap-1 shrink-0">
                  <img
                    src={`https://github.com/${author.login}.png?size=14`}
                    alt={author.login}
                    className="w-3.5 h-3.5 rounded-full"
                  />
                  <span className="truncate max-w-[80px]">{author.login}</span>
                </span>
              </>
            )}
            <span className="w-px h-3 bg-border/60 shrink-0" />
            <span className="whitespace-nowrap shrink-0">{formattedDate}</span>
          </div>
        </div>
      </div>
    )

    if (!hasBody) return row
    return (
      <IssueDialog
        url={url} title={title} formattedDate={formattedDate}
        author={author} isClosed={isClosed} labels={labels} body={body}
      >
        {row}
      </IssueDialog>
    )
  }

  // ── Grid card ─────────────────────────────────────────────────────────────
  const card = (
    <Card
      size="sm"
      className={cn(
        'gap-0 py-0 shadow-none hover:shadow-md transition-all duration-200 border-border/60',
        'border-l-[3px]',
        isClosed ? 'border-l-muted-foreground/30' : 'border-l-primary',
        hasBody && 'cursor-pointer'
      )}
    >
      <CardContent className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <h3 className={cn(
            'text-[15px] font-medium leading-snug break-words line-clamp-2 flex-1 min-w-0',
            isClosed && 'text-muted-foreground'
          )}>
            {title}
          </h3>
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
            {hasBody && (
              <span className="p-1 rounded-md text-muted-foreground/50" title="Has description">
                <FileText className="w-3.5 h-3.5" />
              </span>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
              title="Open on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Author + date */}
        <div className="flex items-center gap-2 flex-wrap text-[13px] text-muted-foreground mb-2">
          {author && (
            <span className="inline-flex items-center gap-1">
              <img
                src={`https://github.com/${author.login}.png?size=16`}
                alt={author.login}
                className="w-3.5 h-3.5 rounded-full"
              />
              <span className="truncate max-w-[80px]">{author.login}</span>
            </span>
          )}
          <span className="text-muted-foreground/60">{formattedDate}</span>
        </div>

        {/* Labels */}
        {labels.nodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.nodes.map(label => (
              <span
                key={label.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium truncate max-w-[120px]"
                style={{ backgroundColor: `#${label.color}`, color: labelTextColor(label.color) }}
                title={label.name}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Repo */}
        {_repoKey && (
          <div className="flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            <span className="text-[11px] text-muted-foreground/50 truncate" title={_repoKey}>
              {_repoKey}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (!hasBody) return card
  return (
    <IssueDialog
      url={url} title={title} formattedDate={formattedDate}
      author={author} isClosed={isClosed} labels={labels} body={body}
    >
      <div>{card}</div>
    </IssueDialog>
  )
}

export default IssueCard
