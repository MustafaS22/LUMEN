const loopback = /^127\.0\.0\.1(?::[0-9]{1,5})?$/

export function isLocalHost(host: string | null) {
  return Boolean(host && loopback.test(host))
}

export function isLocalApiRequest(request: Request) {
  const host = request.headers.get('host')
  return isLocalHost(host) &&
    request.method === 'POST' &&
    request.headers.get('origin') === `http://${host}` &&
    request.headers.get('x-lumen-request') === 'local'
}

export function rejectRemote(request: Request) {
  if (isLocalApiRequest(request)) return null
  return Response.json({ error: 'This request must come from the local LUMEN app.' }, { status: 403 })
}
