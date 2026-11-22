const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/** Parse a date from a source without inventing a replacement when parsing fails. */
export function parseSourceDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null
  const input = value.trim()

  const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T)/)
  if (iso) return validDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))

  const named = input.match(/^(\d{1,2})[\s/-]+([a-z]{3,})[\s,/-]+(\d{2,4})$/i)
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toLowerCase()]
    if (month === undefined) return null
    return validDate(normalizeYear(Number(named[3])), month, Number(named[1]))
  }

  const numeric = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (numeric) return validDate(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]))

  const parsed = new Date(input)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function normalizeYear(year: number) {
  return year < 100 ? (year >= 70 ? 1900 + year : 2000 + year) : year
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month, day, 23, 59, 59))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null
  return date.toISOString()
}
