const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"

export function previewDocument(html: string) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`
  // Keep the policy ahead of any generated document content.
  return `<!doctype html>${meta}${html.replace(/^\s*<!doctype html\s*>/i, '')}`
}
