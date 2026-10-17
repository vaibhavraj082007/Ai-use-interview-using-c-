import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-foreground-muted mt-1">
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
            <Button variant="primary" size="sm">
              Save Changes
            </Button>
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
          <Button variant="danger" size="sm">
            Reset All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
