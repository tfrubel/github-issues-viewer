import { useState } from 'react'

function ChevronIcon({ expanded }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

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
    <div className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 block"
        >
          <h3 className={`text-sm font-medium mb-2 line-clamp-2 ${isClosed ? 'text-gray-500' : 'text-gray-900'}`}>
            {title}
          </h3>
        </a>
        {hasBody && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse description' : 'Expand description'}
            className="flex-shrink-0 mt-0.5 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800"
            title={expanded ? 'Hide description' : 'Show description'}
          >
            <ChevronIcon expanded={expanded} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span>{formattedDate}</span>
          {isClosed && (
            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold uppercase tracking-wide">
              Closed
            </span>
          )}
        </div>
        {labels.nodes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {labels.nodes.map(label => (
              <span
                key={label.id}
                className="px-1.5 py-0.5 rounded-full text-xs truncate max-w-[120px]"
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
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-700 whitespace-pre-wrap break-words max-h-64 overflow-y-auto pr-1">
            {body}
          </div>
        </div>
      )}
    </div>
  )
}

export default IssueCard
