import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAdminWeights, updateAdminWeights, type AdminWeights } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const DEFAULT: AdminWeights = {
  typeWeight: { coding: 1.4, conceptual: 1.1, oral: 1.0 },
  difficultyWeight: { Easy: 1.0, Medium: 1.25, Hard: 1.5 },
}

export default function Weights() {
  const { toast } = useToast()
  const [weights, setWeights] = useState<AdminWeights>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await getAdminWeights()
        if (!mounted) return
        setWeights(res.weights)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load weights')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const update = (path: (w: AdminWeights) => void) => {
    setWeights((w) => { const n = { ...w, typeWeight: { ...w.typeWeight }, difficultyWeight: { ...w.difficultyWeight } }; path(n as any); return n })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await updateAdminWeights(weights)
      setWeights(res.weights)
      toast({ title: 'Weights saved', description: 'Scoring weights updated.', variant: 'success' })
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to save', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Scoring Weights</h2>
        <p className="text-foreground-muted mt-1">Configure type and difficulty weights.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Type Weights</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Coding" type="number" step="0.01" value={weights.typeWeight.coding} onChange={(e) => update(w => (w.typeWeight.coding = parseFloat(e.target.value)||0))} />
          <Input label="Conceptual" type="number" step="0.01" value={weights.typeWeight.conceptual} onChange={(e) => update(w => (w.typeWeight.conceptual = parseFloat(e.target.value)||0))} />
          <Input label="Oral" type="number" step="0.01" value={weights.typeWeight.oral} onChange={(e) => update(w => (w.typeWeight.oral = parseFloat(e.target.value)||0))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Difficulty Weights</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Easy" type="number" step="0.01" value={weights.difficultyWeight.Easy} onChange={(e) => update(w => (w.difficultyWeight.Easy = parseFloat(e.target.value)||0))} />
          <Input label="Medium" type="number" step="0.01" value={weights.difficultyWeight.Medium} onChange={(e) => update(w => (w.difficultyWeight.Medium = parseFloat(e.target.value)||0))} />
          <Input label="Hard" type="number" step="0.01" value={weights.difficultyWeight.Hard} onChange={(e) => update(w => (w.difficultyWeight.Hard = parseFloat(e.target.value)||0))} />
        </CardContent>
      </Card>
      <div>
        <Button variant="primary" size="sm" onClick={save} disabled={saving || loading}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        {error && <p className="text-xs text-error mt-2">{error}</p>}
      </div>
    </div>
  )
}
