import { useState, useRef, useCallback, type DragEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Upload,
  FileText,
  X,
  ArrowRight,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { uploadCv, type CvParseResult } from '@/lib/api'

/* ── constants ─────────────────────────────────────────────────── */

const ROLES = ['Frontend', 'Backend', 'Data', 'Full Stack'] as const
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type Role = (typeof ROLES)[number]
type Difficulty = (typeof DIFFICULTIES)[number]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isAcceptedType(f: File): boolean {
  const name = f.name.toLowerCase()
  return (
    f.type === 'application/pdf' ||
    f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.pdf') ||
    name.endsWith('.docx')
  )
}

/* ── component ─────────────────────────────────────────────────── */

export default function UploadCV() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Arriving from /setup without a stored CV — explain why we are back here.
  const cvRequired =
    (location.state as { reason?: string } | null)?.reason === 'cv-required'

  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<CvParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')

  /* ── parsing ─────────────────────────────────────────────────── */

  const parseFile = useCallback(async (f: File) => {
    setParsing(true)
    setParseError('')
    try {
      const cv = await uploadCv(f)
      setParsed(cv)
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'Could not read the file.'
      )
    } finally {
      setParsing(false)
    }
  }, [])

  /* ── file handling ───────────────────────────────────────────── */

  const acceptFile = useCallback(
    (f: File) => {
      setFileError('')
      setParseError('')
      setParsed(null)

      if (!isAcceptedType(f)) {
        setFileError('Only PDF or DOCX files are accepted.')
        return
      }
      if (f.size > MAX_SIZE) {
        setFileError('File must be under 5 MB.')
        return
      }

      setFile(f)
      void parseFile(f)
    },
    [parseFile]
  )

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) acceptFile(dropped)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  function handleBrowse() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  function removeFile() {
    setFile(null)
    setParsed(null)
    setParsing(false)
    setParseError('')
    setFileError('')
  }

  /* ── continue ────────────────────────────────────────────────── */

  function handleContinue() {
    if (!file || !parsed || !role) return

    // Persist choices (and the extracted text) for the Setup / Interview pages
    localStorage.setItem(
      'interviewly_cv',
      JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        role,
        difficulty,
        text: parsed.text,
        wordCount: parsed.wordCount,
        format: parsed.format,
      })
    )
    navigate('/setup')
  }

  const canContinue =
    file !== null && parsed !== null && role !== '' && !parsing && !parseError

  /* ── render ──────────────────────────────────────────────────── */

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 space-y-8 animate-fade-in">
      {/* CV required notice (arrived from setup without a CV) */}
      {cvRequired && (
        <div
          role="status"
          className="border border-accent/30 bg-accent-light/50 rounded-[var(--radius-md)] px-4 py-3 text-sm text-accent animate-fade-in"
        >
          A CV is required to start an interview — upload yours below to
          continue.
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Upload Your CV</h1>
        <p className="text-foreground-muted">
          Upload your resume so our AI can generate personalised interview
          questions tailored to your experience.
        </p>
      </div>

      {/* ── Drop zone / file preview ───────────────────────────── */}
      {!file ? (
        <>
          <div
            id="cv-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleBrowse}
            className={cn(
              'border-2 border-dashed rounded-[var(--radius-lg)] p-12 text-center space-y-4 transition-colors duration-200 cursor-pointer',
              dragging
                ? 'border-accent bg-accent-light/40'
                : 'border-border hover:border-accent/40'
            )}
          >
            <div className="mx-auto h-12 w-12 rounded-full bg-accent-light flex items-center justify-center">
              <Upload className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Drag &amp; drop your resume here
              </p>
              <p className="text-xs text-foreground-subtle">
                PDF or DOCX · up to 5 MB
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleBrowse()
              }}
            >
              Browse Files
            </Button>
          </div>

          {/* hidden native input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />

          {/* file error */}
          {fileError && (
            <p className="text-sm text-error animate-fade-in">{fileError}</p>
          )}
        </>
      ) : (
        /* ── uploaded file card ──────────────────────────────── */
        <div className="border border-border rounded-[var(--radius-md)] bg-surface-raised p-4 flex items-center gap-4 animate-scale-in">
          <div className="h-10 w-10 rounded-[var(--radius-sm)] bg-accent-light flex items-center justify-center shrink-0">
            {parsing ? (
              <Loader2 className="h-5 w-5 text-accent animate-spin" />
            ) : (
              <FileText className="h-5 w-5 text-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {file.name}
            </p>
            <p className="text-xs text-foreground-subtle">
              {formatSize(file.size)} · {parsed?.format === 'docx' ? 'DOCX' : 'PDF'}
              {parsed ? ` · ${parsed.wordCount} words extracted` : ''}
              {parsing ? ' · Parsing…' : ''}
            </p>
            {parseError && (
              <p className="text-xs text-error mt-1 animate-fade-in">
                {parseError}{' '}
                <button
                  type="button"
                  onClick={() => void parseFile(file)}
                  className="underline underline-offset-2 font-medium cursor-pointer"
                >
                  Retry
                </button>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1.5 rounded-[var(--radius-sm)] text-foreground-subtle hover:text-foreground hover:bg-accent-light/50 transition-colors duration-150 cursor-pointer"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Role dropdown ──────────────────────────────────────── */}
      <div className="space-y-3">
        <label
          htmlFor="cv-role"
          className="text-sm font-medium text-foreground"
        >
          Target Role
        </label>
        <div className="relative">
          <select
            id="cv-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={cn(
              'w-full h-10 pl-3.5 pr-10 text-sm rounded-[var(--radius-md)]',
              'bg-surface-raised text-foreground border border-border',
              'transition-colors duration-150 appearance-none cursor-pointer',
              'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/30',
              role === '' && 'text-foreground-subtle'
            )}
          >
            <option value="" disabled>
              Select a target role…
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
        </div>
      </div>

      {/* ── Difficulty selector ────────────────────────────────── */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Difficulty
        </label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={cn(
                'px-4 py-2 text-sm rounded-full border transition-colors duration-150 cursor-pointer',
                difficulty === d
                  ? 'border-accent bg-accent-light text-accent font-medium'
                  : 'border-border text-foreground-muted hover:border-accent/40 hover:text-accent hover:bg-accent-light/40'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Continue button ────────────────────────────────────── */}
      <Button
        id="cv-continue"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        {parsing ? 'Reading CV…' : 'Continue'}{' '}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
