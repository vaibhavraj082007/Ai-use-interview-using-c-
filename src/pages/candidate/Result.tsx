import { Download, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ReportSheet } from '@/components/report-sheet'
import type { GradingResult } from '@/lib/api'
import { exportElementAsPdf } from '@/lib/pdf'

function formatDate(ts: number | null): string {
  if (!ts) return 'Recently'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return 'Recently'
  }
}

export default function Result() {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<GradingResult | null>(null)
  const [gradedAt, setGradedAt] = useState<number | null>(null)
  const [setupRole, setSetupRole] = useState<string>('Interview')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const rawResult = localStorage.getItem('interviewly_result')
    if (rawResult) {
      try {
        const parsed = JSON.parse(rawResult) as GradingResult
        setResult(parsed)
      } catch {
        setResult(null)
      }
    }

    const rawMeta = localStorage.getItem('interviewly_grading_meta')
    if (rawMeta) {
      try {
        const meta = JSON.parse(rawMeta) as { gradedAt?: number }
        if (typeof meta.gradedAt === 'number') setGradedAt(meta.gradedAt)
      } catch {
        setGradedAt(null)
      }
    }

    const rawSetup = localStorage.getItem('interviewly_setup')
    if (rawSetup) {
      try {
        const setup = JSON.parse(rawSetup) as { role?: string }
        if (setup.role) setSetupRole(setup.role)
      } catch {
        setSetupRole('Interview')
      }
    }
  }, [])

  const downloadPdf = async () => {
    if (!sheetRef.current || exporting) return
    setExporting(true)
    try {
      await exportElementAsPdf(
        sheetRef.current,
        `interviewly-report-${Date.now()}.pdf`
      )
    } finally {
      setExporting(false)
    }
  }

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-6 animate-fade-in text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Interview Results
          </h1>
          <p className="text-foreground-muted">
            No grading results were found for the last session.
          </p>
          <p className="text-sm text-foreground-subtle">
            Past interviews are kept in your{' '}
            <NavLink to="/history" className="text-accent underline">
              history
            </NavLink>
            .
          </p>
        </div>
        <NavLink to="/setup">
          <Button variant="primary">
            <RotateCcw className="h-4 w-4" /> Start New Interview
          </Button>
        </NavLink>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-6 animate-fade-in">
      {/* Page header + actions (themed — outside the printable sheet) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Interview Results
          </h1>
          <p className="text-foreground-muted">
            {setupRole} — Completed {formatDate(gradedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <NavLink to="/setup">
            <Button variant="secondary">
              <RotateCcw className="h-4 w-4" /> Retry Interview
            </Button>
          </NavLink>
          <Button variant="primary" onClick={downloadPdf} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? 'Preparing PDF…' : 'Download Report (PDF)'}
          </Button>
        </div>
      </div>

      {/* Printable report sheet — white background, black ink */}
      <ReportSheet ref={sheetRef} result={result} gradedAt={gradedAt} role={setupRole} />
    </div>
  )
}
