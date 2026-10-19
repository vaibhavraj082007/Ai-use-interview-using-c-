import { forwardRef } from 'react'
import type {
  AnswerBand,
  AnswerEvaluation,
  GradingResult,
  OverallBand,
  SkillScore,
  SpeechMetric,
  TypeScore,
} from '@/lib/api'

const TYPE_LABEL: Record<string, string> = {
  coding: 'Coding',
  conceptual: 'Conceptual',
  oral: 'Oral',
}

/** Monochrome (white bg / black ink) badges for the printable sheet. */
const ANSWER_BADGE: Record<AnswerBand, string> = {
  excellent: 'bg-[#111111] text-white',
  good: 'bg-[#111111] text-white',
  average: 'border border-[#111111] text-[#111111]',
  weak: 'border border-[#737373] text-[#737373]',
  missing: 'border border-[#d4d4d4] text-[#737373]',
}

function formatBand(band: OverallBand): string {
  return band
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(ts: number | null): string {
  if (!ts) return 'Recently'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return 'Recently'
  }
}

interface ReportSheetProps {
  result: GradingResult
  gradedAt: number | null
  role: string
}

/**
 * Printable report sheet — white background, black ink, hex colors only
 * (html2canvas cannot parse the oklch values behind Tailwind theme tokens).
 * The Download PDF button must export this exact element.
 */
export const ReportSheet = forwardRef<HTMLDivElement, ReportSheetProps>(
  function ReportSheet({ result, gradedAt, role }, ref) {
    const answeredPct =
      result.total === 0
        ? 0
        : Math.round((result.answered / result.total) * 100)
    const proctor = result.proctor

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 rounded-lg border border-[#e5e5e5] space-y-8"
      >
        {/* Sheet header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e5e5e5] pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-black">
              Interviewly — Candidate Report
            </h2>
            <p className="text-sm text-[#525252]">
              {role} — {result.answered} of {result.total} answered (
              {answeredPct}%) — Graded {formatDate(gradedAt)}
            </p>
            <p className="text-xs text-[#737373] max-w-2xl">
              {result.summary}
            </p>
          </div>
          <div className="border border-black px-3 py-1.5 text-sm font-semibold text-black">
            {result.overall}% {formatBand(result.band)}
          </div>
        </div>

        {/* Camera confidence meter (falls when the candidate looks away) */}
        {proctor && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              Camera Confidence
            </h3>
            <div className="flex items-center justify-between text-sm text-black">
              <span>Out of 100%</span>
              <span className="font-semibold">{proctor.confidence}%</span>
            </div>
            <div className="h-2.5 bg-[#e5e5e5] rounded-full overflow-hidden">
              <div
                className="h-full bg-black rounded-full"
                style={{ width: `${proctor.confidence}%` }}
              />
            </div>
            <p className="text-[11px] text-[#737373]">
              Session: {proctor.sessionSeconds}s — Flagged:{' '}
              {proctor.flaggedSeconds}s — Events: {proctor.flags}
              {Object.keys(proctor.byType ?? {}).length > 0 &&
                ` — ${Object.entries(proctor.byType)
                  .map(([k, v]) => `${k.replace('_', ' ')} ${v}s`)
                  .join(' · ')}`}
            </p>
          </div>
        )}

        {/* Skill + type breakdowns */}
        {(result.skills.length > 0 || result.types.length > 0) && (
          <div className="grid gap-6 md:grid-cols-2">
            {result.skills.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  By Skill
                </h3>
                <div className="space-y-4">
                  {result.skills.map((s: SkillScore) => (
                    <div key={s.skill} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-black">{s.skill}</span>
                        <span className="font-medium text-black">
                          {s.score}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black rounded-full"
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#737373]">
                        {s.questions} question{s.questions === 1 ? '' : 's'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.types.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  By Question Type
                </h3>
                <div className="space-y-4">
                  {result.types.map((t: TypeScore) => (
                    <div key={t.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-black">
                          {TYPE_LABEL[t.type] ?? t.type}
                        </span>
                        <span className="font-medium text-black">
                          {t.score}%
                        </span>
                      </div>
                      <div className="h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black rounded-full"
                          style={{ width: `${t.score}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#737373]">
                        {t.questions} question{t.questions === 1 ? '' : 's'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Speaking performance */}
        {(result.speech?.length ?? 0) > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              Speaking Performance
            </h3>
            <div className="space-y-5">
              {(result.speech ?? []).map((m: SpeechMetric, idx: number) => {
                const ev = result.evaluations.find(
                  (e) => e.questionId === m.questionId
                )
                return (
                  <div
                    key={m.questionId}
                    className="space-y-2 border-b border-[#e5e5e5] pb-5 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-[#737373]">
                        Spoken answer {idx + 1}
                      </span>
                      {ev && (
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold ${ANSWER_BADGE[ev.band]}`}
                        >
                          {ev.band === 'missing' ? 'No answer' : `${ev.score}%`}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-[#404040]">
                      {m.text}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#525252]">
                      <span>
                        Spoken:{' '}
                        {Math.floor((m.spokenSeconds ?? 0) / 60)}:
                        {String((m.spokenSeconds ?? 0) % 60).padStart(2, '0')}
                      </span>
                      <span>Words: {m.wordCount ?? 0}</span>
                      <span>
                        Confidence:{' '}
                        {m.confidence === null || m.confidence === undefined
                          ? '—'
                          : `${Math.round(m.confidence * 100)}%`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Per-question feedback */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black">
            Question Feedback
          </h3>
          <div className="space-y-5">
            {result.evaluations.map((e: AnswerEvaluation, idx: number) => (
              <div
                key={e.questionId}
                className="space-y-3 border-b border-[#e5e5e5] pb-5 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-black">
                    Q{idx + 1} — {e.questionId}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold ${ANSWER_BADGE[e.band]}`}
                  >
                    {e.band === 'missing' ? 'No answer' : `${e.score}%`}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-[#404040]">
                  {e.feedback}
                </p>

                {e.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black">
                      Strengths
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-[#525252]">
                      {e.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {e.improvements.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black">
                      Areas to improve
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-[#525252]">
                      {e.improvements.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-[#a3a3a3] border-t border-[#e5e5e5] pt-4">
          Generated by Interviewly — flags and confidence are informational and
          never affect the graded score.
        </p>
      </div>
    )
  }
)
