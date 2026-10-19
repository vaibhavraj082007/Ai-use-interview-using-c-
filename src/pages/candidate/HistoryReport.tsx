import { useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportSheet } from '@/components/report-sheet'
import { getMyReport, type MyReportDetail } from '@/lib/api'
import { exportElementAsPdf } from '@/lib/pdf'

function formatDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return 'Recently'
  }
}

export default function HistoryReport() {
  const params = useParams<{ id: string }>()
  const id = params.id || ''
  const sheetRef = useRef<HTMLDivElement>(null)
  const [report, setReport] = useState<MyReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!id) return
    let mounted = true
    async function load() {
      try {
        const res = await getMyReport(id)
        if (mounted) setReport(res.report)
      } catch (e) {
        if (mounted)
          setError(e instanceof Error ? e.message : 'Report not found')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [id])

  const downloadPdf = async () => {
    if (!sheetRef.current || exporting) return
    setExporting(true)
    try {
      await exportElementAsPdf(
        sheetRef.current,
        `interviewly-report-${id}-${Date.now()}.pdf`
      )
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-foreground-muted flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
      </div>
    )
  }

  if (error || !report || !report.result) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-4 text-center">
        <p className="text-sm text-error">{error ?? 'Report not found'}</p>
        <NavLink to="/history">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to History
          </Button>
        </NavLink>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6 animate-fade-in">
      {/* Header + actions (themed — outside the printable sheet) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <NavLink
            to="/history"
            className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to History
          </NavLink>
          <h1 className="text-2xl font-bold text-foreground">
            {report.role} Report
          </h1>
          <p className="text-sm text-foreground-muted">
            {report.candidateName}
            {report.candidateEmail ? ` · ${report.candidateEmail}` : ''} —
            graded {formatDateTime(report.gradedAt)}
          </p>
        </div>
        <Button variant="primary" onClick={downloadPdf} disabled={exporting}>
          <Download className="h-4 w-4" />
          {exporting ? 'Preparing PDF…' : 'Download PDF'}
        </Button>
      </div>

      {/* Printable report sheet — white background, black ink */}
      <ReportSheet
        ref={sheetRef}
        result={report.result}
        gradedAt={report.gradedAt}
        role={report.role}
      />
    </div>
  )
}
