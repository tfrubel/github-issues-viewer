import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

// Eagerly load every theme file in src/themes as a raw string.
const themeModules = import.meta.glob('../../themes/theme_*.css', {
  query: '?inline',
  import: 'default',
  eager: true,
})

// Build a { id: { label, css } } map from the file paths.
const THEMES = Object.fromEntries(
  Object.entries(themeModules).map(([path, css]) => {
    const file = path.split('/').pop().replace(/^theme_/, '').replace(/\.css$/, '')
    const id = file.trim().replace(/\s+/g, '_')
    const label = id
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
    return [id, { label, css }]
  })
)

const DEFAULT_THEME = 'claude'
const STORAGE_KEY = 'app-theme-name'
const STYLE_TAG_ID = 'dynamic-theme'

// Strip @theme / @layer blocks — only :root and .dark variable blocks
// can be safely injected at runtime.
function extractVariableBlocks(css) {
  const out = []
  const re = /(:root|\.dark)\s*\{[^}]*\}/g
  let m
  while ((m = re.exec(css)) !== null) out.push(m[0])
  return out.join('\n')
}

function applyTheme(id) {
  const theme = THEMES[id] || THEMES[DEFAULT_THEME]
  if (!theme) return
  let tag = document.getElementById(STYLE_TAG_ID)
  if (!tag) {
    tag = document.createElement('style')
    tag.id = STYLE_TAG_ID
    document.head.appendChild(tag)
  }
  tag.textContent = extractVariableBlocks(theme.css)
}

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  applyTheme(stored)
}

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  )

  useEffect(() => {
    applyTheme(current)
    localStorage.setItem(STORAGE_KEY, current)
  }, [current])

  const ids = Object.keys(THEMES).sort((a, b) =>
    a === DEFAULT_THEME ? -1 : b === DEFAULT_THEME ? 1 : a.localeCompare(b)
  )

  return (
    <Select value={current} onValueChange={setCurrent}>
      <SelectTrigger
        size="sm"
        aria-label="Select theme"
        className="h-9 rounded-full text-xs uppercase tracking-[0.14em] gap-2"
      >
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent align="end">
        {ids.map(id => (
          <SelectItem key={id} value={id} className="text-xs uppercase tracking-[0.12em]">
            {THEMES[id].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
