import ReactMarkdown from 'react-markdown'
import { ExternalLink, FileText, GitBranch, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { cn } from '@/lib/utils'

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// For light-colored labels (e.g. pale blue), darken to a rich, readable shade
// by preserving hue but reducing lightness and boosting saturation via HSL.
function deepenLabelColor(hex) {
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  // Already a dark color — use as-is at full opacity
  if (l <= 0.55) return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.9)`

  // Compute hue and saturation
  const d = max - min
  const s = d === 0 ? 0 : (l > 0.5 ? d / (2 - max - min) : d / (max + min))
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  // Target: same hue, boosted saturation, noticeably darker
  const newL = 0.42
  const newS = Math.min(Math.max(s * 1.2, 0.6), 0.78)

  const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS
  const p = 2 * newL - q
  const hue2rgb = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const ro = Math.round(hue2rgb(h + 1 / 3) * 255)
  const go = Math.round(hue2rgb(h) * 255)
  const bo = Math.round(hue2rgb(h - 1 / 3) * 255)
  return `rgb(${ro}, ${go}, ${bo})`
}

function labelStyle(hex) {
  return {
    backgroundColor: hexToRgba(hex, 0.12),
    color: deepenLabelColor(hex),
    border: `1px solid ${hexToRgba(hex, 0.22)}`,
  }
}

const markdownProseClasses = `prose prose-sm max-w-none
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
  [&_td]:border-b [&_td]:border-border/50 [&_td]:py-1 [&_td]:pr-3`

function CommentThread({ comments, issueUrl }) {
  const nodes = comments?.nodes || []
  const total = comments?.totalCount || 0
  const remaining = total - nodes.length

  return (
    <section className="mt-6 pt-5 border-t border-border">
      <header className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Discussion
          </span>
          <h4 className="font-display text-xl font-normal italic text-foreground">
            {total === 0 ? 'No comments yet' : total === 1 ? '1 comment' : `${total} comments`}
          </h4>
        </div>
        {total > 0 && (
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            View on GitHub →
          </a>
        )}
      </header>

      {nodes.length === 0 ? (
        <p className="text-sm italic text-muted-foreground py-4">
          The conversation hasn't started.
        </p>
      ) : (
        <ol className="space-y-5">
          {nodes.map((c, i) => {
            const date = new Date(c.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })
            return (
              <li key={c.id} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0 pt-1">
                  {c.author?.login ? (
                    <img
                      src={`https://github.com/${c.author.login}.png?size=64`}
                      alt={c.author.login}
                      className="w-8 h-8 rounded-full border border-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted border border-border" />
                  )}
                  <span className="font-display text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex-1 min-w-0 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2 mb-2 pb-2 border-b border-border/60">
                    <span className="text-sm font-medium text-foreground">
                      {c.author?.login || 'ghost'}
                    </span>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {date}
                    </a>
                  </div>
                  <div className={`text-sm text-foreground/80 leading-relaxed ${markdownProseClasses}`}>
                    <ReactMarkdown>{c.body || '*(empty comment)*'}</ReactMarkdown>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {remaining > 0 && (
        <div className="mt-5 text-center">
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="inline-block w-6 h-px bg-border" />
            {remaining} more {remaining === 1 ? 'comment' : 'comments'} on GitHub
            <span className="inline-block w-6 h-px bg-border" />
          </a>
        </div>
      )}
    </section>
  )
}

function IssueDialog({ url, title, formattedDate, author, isClosed, labels, body, comments, children }) {
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
                style={labelStyle(label.color)}
              >
                {label.name}
              </span>
            ))}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className={`px-5 py-4 text-sm text-foreground/80 leading-relaxed ${markdownProseClasses} content`}>
            <ReactMarkdown>{body}</ReactMarkdown>
            <CommentThread comments={comments} issueUrl={url} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function IssueCard({ issue, viewMode = 'grid' }) {
  const { title, body, url, createdAt, labels, state, author, _repoKey, comments } = issue
  const isClosed = state === 'CLOSED'
  const hasBody = !!(body && body.trim())
  const commentCount = comments?.totalCount || 0
  const hasComments = commentCount > 0
  const isOpenable = hasBody || hasComments

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
          isOpenable ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/30'
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
                'text-base font-medium break-words line-clamp-2 flex-1 min-w-0',
                isClosed && 'text-muted-foreground'
              )}
              title={title}
            >
              {title}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasBody && (
                <FileText className="w-3.5 h-3.5 text-muted-foreground/40" title="Has description" />
              )}
              {hasComments && (
                <span
                  className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/70 tabular-nums"
                  title={`${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {commentCount}
                </span>
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
          <div className="flex items-center gap-2 flex-wrap text-[13px] text-muted-foreground/70">
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
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0"
                style={labelStyle(label.color)}
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

    if (!isOpenable) return row
    return (
      <IssueDialog
        url={url} title={title} formattedDate={formattedDate}
        author={author} isClosed={isClosed} labels={labels} body={body} comments={comments}
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
        isOpenable && 'cursor-pointer'
      )}
    >
      <CardContent className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <h3 className={cn(
            'text-base font-medium leading-snug break-words line-clamp-2 flex-1 min-w-0',
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
            {hasComments && (
              <span
                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[11px] text-muted-foreground/70 tabular-nums"
                title={`${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {commentCount}
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
        <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mb-2">
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
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[13px] font-medium truncate max-w-[120px]"
                style={labelStyle(label.color)}
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
            <span className="text-xs text-muted-foreground/50 truncate" title={_repoKey}>
              {_repoKey}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (!isOpenable) return card
  return (
    <IssueDialog
      url={url} title={title} formattedDate={formattedDate}
      author={author} isClosed={isClosed} labels={labels} body={body} comments={comments}
    >
      <div>{card}</div>
    </IssueDialog>
  )
}

export default IssueCard
