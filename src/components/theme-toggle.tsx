import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme, type Theme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

const ORDER: Theme[] = ['light', 'dark', 'system']

const META: Record<Theme, { icon: React.ReactNode; label: string }> = {
  light: { icon: <Sun className="h-4 w-4" />, label: 'Light' },
  dark: { icon: <Moon className="h-4 w-4" />, label: 'Dark' },
  system: { icon: <Monitor className="h-4 w-4" />, label: 'System' },
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    setTheme(next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      className={cn('h-9 w-9', className)}
      title={`Theme: ${META[theme].label} — click to change`}
      aria-label={`Switch theme (currently ${META[theme].label})`}
    >
      {META[theme].icon}
    </Button>
  )
}
