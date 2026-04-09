import { useState, useEffect } from 'react'
import { hasValidCredentials, clearCredentials } from './utils/localStorage'
import { clearCache } from './utils/cache'
import LoginForm from './components/LoginForm/LoginForm'
import IssueList from './components/IssueList/IssueList'
import { Button } from './components/ui/button'
import ThemeSwitcher from './components/ThemeSwitcher/ThemeSwitcher'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    setIsAuthenticated(hasValidCredentials())
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleAuthFailure = () => {
    clearCredentials()
    clearCache()
    setIsAuthenticated(false)
  }

  return (
    <div className="min-h-screen grain-bg">
      <header className="container mx-auto px-6 pt-8 pb-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <a
            href="https://github.com/tfrubel/github-issues-viewer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            title="View source on GitHub"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-5 h-5 transition-transform group-hover:rotate-12"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="text-xs uppercase tracking-[0.18em] font-medium hidden sm:inline">Source</span>
          </a>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAuthFailure}
                aria-label="Logout"
                className="text-xs uppercase tracking-[0.14em]"
              >
                Logout
              </Button>
            )}
            <ThemeSwitcher />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDark(d => !d)}
              aria-label="Toggle dark mode"
              className="rounded-full"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              <span className="inline-block w-6 h-px bg-primary align-middle mr-2" />
              The Daily Triage
            </p>
            <h1 className="font-display text-5xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground">
              Issues, <em className="italic font-normal text-primary" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>at a glance</em>.
            </h1>
          </div>
          <p className="hidden md:block max-w-xs text-sm text-muted-foreground text-right leading-relaxed pb-2">
            Every open thread, every closed loop — gathered from across your repositories into one quiet desk.
          </p>
        </div>
      </header>

      <main className="container mx-auto pb-16">
        {isAuthenticated ? (
          <IssueList onAuthFailure={handleAuthFailure} />
        ) : (
          <div className="max-w-md mx-auto px-6">
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
