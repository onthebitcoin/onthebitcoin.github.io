// Tiny client-side CSV export helper — no dependency needed for this scale.
export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => {
    const str = String(value)
    // Quote any field containing a comma, quote, or newline; double up quotes.
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? '')).join(',')),
  ]
  const csv = lines.join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
