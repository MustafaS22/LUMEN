import { NextResponse, type NextRequest } from 'next/server'
import { isLocalApiRequest, isLocalHost } from '@/lib/local-request'

export function proxy(request: NextRequest) {
  if (!isLocalHost(request.headers.get('host'))) {
    return new NextResponse('Open LUMEN on 127.0.0.1.', { status: 403 })
  }
  if (request.nextUrl.pathname.startsWith('/api/') && !isLocalApiRequest(request)) {
    return NextResponse.json({ error: 'This request must come from the local LUMEN app.' }, { status: 403 })
  }
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}

export const config = { matcher: '/((?!_next/static|_next/image).*)' }
