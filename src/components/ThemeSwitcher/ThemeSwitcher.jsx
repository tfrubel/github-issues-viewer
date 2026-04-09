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
const FONT_LINK_ID = 'dynamic-theme-fonts'

// Generic CSS keywords that should never be requested from Google Fonts.
const GENERIC_FONTS = new Set([
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
  'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  '-apple-system', 'blinkmacsystemfont', 'inherit', 'initial', 'unset',
])

// Pull every font family referenced by --font-* declarations.
function extractFontFamilies(css) {
  const families = new Set()
  const re = /--font-[\w-]+\s*:\s*([^;}]+)[;}]/g
  let m
  while ((m = re.exec(css)) !== null) {
    m[1].split(',').forEach(part => {
      const name = part.trim().replace(/^["']|["']$/g, '')
      if (!name || name.startsWith('var(')) return
      if (GENERIC_FONTS.has(name.toLowerCase())) return
      families.add(name)
    })
  }
  return [...families]
}

function buildGoogleFontsHref(families) {
  if (!families.length) return ''
  const params = families
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

function applyFonts(css) {
  const href = buildGoogleFontsHref(extractFontFamilies(css))
  let link = document.getElementById(FONT_LINK_ID)
  if (!href) {
    if (link) link.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

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
  applyFonts(theme.css)
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
