import { createHash } from 'node:crypto'

/**
 * Stable identity for a question across sessions.
 *
 * Normalised (trimmed + lowercased) so cosmetic casing differences never
 * defeat the "never show the same question twice" guarantee. Stored per
 * user in the SeenQuestion table.
 */
export function questionHash(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex')
}
