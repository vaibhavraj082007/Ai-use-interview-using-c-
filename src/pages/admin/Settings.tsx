import { useState } from 'react'
import { Sun, Moon, Monitor, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useTheme, type Theme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
]

export default function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-foreground-muted">
          Manage platform configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Basic platform settings and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Platform Name" placeholder="Interviewly" />
          <Input
            label="Support Email"
            type="email"
            placeholder="support@interviewly.ai"
          />
          <Input
            label="Max Questions per Interview"
            type="number"
            placeholder="30"
          />
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                toast({
                  title: 'Settings saved',
                  description: 'Your changes have been applied.',
                  variant: 'success',
                })
              }
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how Interviewly looks on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-150 cursor-pointer',
                  theme === option.value
                    ? 'border-accent bg-accent-light font-medium text-accent'
                    : 'border-border text-foreground-muted hover:border-accent/40 hover:text-accent'
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions — proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="danger" size="sm">
                <Trash2 className="h-4 w-4" />
                Reset All Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset all data?</DialogTitle>
                <DialogDescription>
                  This will permanently delete all candidates, interviews, and
                  results. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" size="sm">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setResetOpen(false)
                    toast({
                      title: 'All data reset',
                      description: 'The demo dataset has been cleared.',
                      variant: 'error',
                    })
                  }}
                >
                  Yes, reset everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
