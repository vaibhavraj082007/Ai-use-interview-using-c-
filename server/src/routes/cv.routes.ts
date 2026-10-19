import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { requireAuth } from '../auth/middleware.js'
import { httpError } from '../lib/http-error.js'
import { parseCv, type CvFormat } from '../lib/parse-cv.js'

const router = Router()

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

const ALLOWED_MIME: Record<string, CvFormat> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

function detectFormat(originalname: string, mimetype: string): CvFormat | null {
  const byMime = ALLOWED_MIME[mimetype]
  if (byMime) return byMime

  // Fall back to the extension — some clients send an empty/generic mimetype.
  const lower = originalname.toLowerCase()
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.docx')) return 'docx'
  return null
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1 },
})

/** Wraps multer so its errors surface as clean 400s instead of 500s. */
function runUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) return next()

    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File must be under 5 MB.'
          : `Upload failed: ${err.message}`
      return next(httpError.badRequest(message))
    }

    return next(err)
  })
}

/* ── POST /api/cv/parse ──────────────────────────────────────── */

router.post('/parse', requireAuth, runUpload, async (req, res, next) => {
  try {
    const file = req.file
    if (!file) throw httpError.badRequest('No file uploaded.')
    if (file.size === 0) throw httpError.badRequest('The file is empty.')

    const format = detectFormat(file.originalname, file.mimetype)
    if (!format) throw httpError.badRequest('Only PDF or DOCX files are accepted.')

    let parsed
    try {
      parsed = await parseCv(file.buffer, format)
    } catch {
      throw httpError.badRequest(
        'Could not read that file. Please try a different one.'
      )
    }

    if (!parsed.text) {
      throw httpError.badRequest(
        'No readable text was found in the file (it may be a scanned image).'
      )
    }

    res.json({
      cv: {
        text: parsed.text,
        wordCount: parsed.wordCount,
        charCount: parsed.charCount,
        format: parsed.format,
        fileName: file.originalname,
        fileSize: file.size,
      },
    })
  } catch (err) {
    next(err)
  }
})

export { router as cvRouter }
