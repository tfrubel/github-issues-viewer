import { useState } from 'react'
import IssueCard from '../IssueCard/IssueCard'
import { getPreferences, toggleCollapsed } from '../../utils/preferences'

function ChevronIcon({ collapsed }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
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

function RepositoryGroup({ repository, state = 'open', scope = 'me' }) {
  const { nameWithOwner, issues, viewerLogin } = repository
  const initiallyCollapsed = !!getPreferences().collapsed[nameWithOwner]
  const [collapsed, setCollapsed] = useState(initiallyCollapsed)

  const stateQ = state === 'closed' ? 'state%3Aclosed' : 'state%3Aopen'
  const assigneeQ = scope === 'all' ? '' : `+assignee%3A${viewerLogin}`
  const issuesUrl = `https://github.com/${nameWithOwner}/issues?q=is%3Aissue+${stateQ}${assigneeQ}`

  const handleToggle = () => {
    toggleCollapsed(nameWithOwner)
    setCollapsed(c => !c)
  }

  return (
    <div className={`p-2 ${collapsed ? 'h-auto' : 'h-[500px]'}`}>
      <div className="bg-white rounded-lg shadow-lg flex flex-col border border-gray-300 h-full">
        <div className="p-3 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleToggle}
              aria-expanded={!collapsed}
              aria-label={collapsed ? `Expand ${nameWithOwner}` : `Collapse ${nameWithOwner}`}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 flex-shrink-0"
            >
              <ChevronIcon collapsed={collapsed} />
            </button>
            <a
              href={issuesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold text-gray-800 hover:text-blue-600 truncate flex-1"
              title={`View ${state} issues in ${nameWithOwner} on GitHub`}
            >
              {nameWithOwner}
            </a>
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-sm flex-shrink-0">
              {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
            </span>
          </div>
        </div>
        {!collapsed && (
          <div className="px-3 pb-3 flex-grow overflow-hidden">
            <div className="space-y-2 overflow-y-auto h-full pr-1">
              {issues.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RepositoryGroup
