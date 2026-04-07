import ReactMarkdown from 'react-markdown'
import { ExternalLink, FileText } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Separator } from '../ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { cn } from '@/lib/utils'

function IssueCard({ issue }) {
  const { title, body, url, createdAt, labels, state } = issue
  const isClosed = state === 'CLOSED'
  const hasBody = !!(body && body.trim())

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const card = (
    <Card size="sm" className="gap-0 py-0 shadow-xs hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={cn(
            "text-sm font-medium break-words line-clamp-2 flex-1 min-w-0",
            isClosed && "text-muted-foreground"
          )}>
            {title}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {hasBody && (
              <span className="p-1 rounded-md text-muted-foreground" title="Has description">
                <FileText className="w-3.5 h-3.5" />
              </span>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Open on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
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
      </CardContent>
    </Card>
  )

  if (!hasBody) {
    return card
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer">{card}</div>
      </DialogTrigger>
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
            {isClosed && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide h-4 px-1.5">
                Closed
              </Badge>
            )}
            {labels.nodes.map(label => (
              <span
                key={label.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: `#${label.color}`,
                  color: parseInt(label.color, 16) > 0xffffff / 2 ? '#000' : '#fff'
                }}
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
            [&_td]:border-b [&_td]:border-border/50 [&_td]:py-1 [&_td]:pr-3">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default IssueCard
