import type { Categories, State } from './types'

/**
 * Provisional. The insert format is still undecided — grouped by category with
 * the category note under the heading, feelings as a list, feeling notes after
 * an em dash. Whether words become [[wikilinks]] is the open question.
 */
export function buildMarkdown(state: State, categories: Categories): string {
  const blocks: string[] = []

  for (const category of categories) {
    const picked = state.selections[category.name]
    if (!picked || picked.selected.length === 0) continue

    const lines = [`## ${category.name}`]
    if (picked.note !== '') lines.push('', picked.note)
    lines.push('')
    for (const word of picked.selected) {
      const note = picked.notes[word] ?? ''
      lines.push(note === '' ? `- ${word}` : `- ${word} — ${note}`)
    }
    blocks.push(lines.join('\n'))
  }

  return blocks.join('\n\n')
}
