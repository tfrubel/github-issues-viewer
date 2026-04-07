import { useState } from 'react'
import { saveCredentials } from '../../utils/localStorage'
import { validateCredentials } from '../../services/github'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

function TokenInstructions() {
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How to Create a GitHub Personal Access Token</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-3">
        <ol className="list-decimal list-inside space-y-2">
          <li>Go to GitHub Settings → Developer Settings → <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Personal Access Tokens</a> → Tokens (classic)</li>
          <li>Click "Generate new token (classic)"</li>
          <li>Give your token a descriptive name</li>
          <li>For scopes, select:
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li><code className="bg-muted px-1 py-0.5 rounded text-xs">repo</code> — Full control of private repositories</li>
              <li>Required to access both public and private repository issues</li>
            </ul>
          </li>
          <li>Click "Generate token"</li>
          <li>Copy your token immediately — you won't be able to see it again!</li>
        </ol>
        <div className="p-3 bg-primary/10 border border-primary/20 rounded text-sm text-foreground">
          <strong>Important:</strong> Keep your token secure and never commit it to version control. The app stores it locally and only uses it to make authenticated requests to GitHub's API.
        </div>
      </CardContent>
    </Card>
  )
}

function LoginForm({ onLoginSuccess }) {
  const [credentials, setCredentials] = useState({ username: '', pat: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await validateCredentials(credentials.username, credentials.pat)
      saveCredentials(credentials.username, credentials.pat)
      onLoginSuccess()
    } catch (error) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setCredentials(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">GitHub Username</Label>
              <Input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pat">Personal Access Token</Label>
              <Input
                type="password"
                id="pat"
                name="pat"
                value={credentials.pat}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Validating…' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <TokenInstructions />
    </div>
  )
}

export default LoginForm
