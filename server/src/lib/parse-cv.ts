import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export type CvFormat = 'pdf' | 'docx'

export interface ParsedCv {
  text: string
  wordCount: number
  charCount: number
  format: CvFormat
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, '\n') // normalise line endings
    .replace(/^--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '') // strip pdf page markers
    .replace(/[ \t]+/g, ' ') // collapse runs of spaces/tabs
    .replace(/\n{3,}/g, '\n\n') // collapse 3+ blank lines to one
    .trim()
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text ?? ''
  } finally {
    await parser.destroy()
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value ?? ''
}

export async function parseCv(
  buffer: Buffer,
  format: CvFormat
): Promise<ParsedCv> {
  const raw = format === 'pdf' ? await extractPdf(buffer) : await extractDocx(buffer)

  const text = normalize(raw)
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0

  return { text, wordCount, charCount: text.length, format }
}
