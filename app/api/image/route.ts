import { rejectRemote } from '@/lib/local-request'
import { z } from 'zod'
import { chatgptError, complete, parseModelJSON } from '@/lib/chatgpt'

export const maxDuration = 100

const color = z.string().regex(/^#[a-f0-9]{6}$/i)
const paint = z.union([color, z.literal('none')])
const coordinate = z.number().min(-1024).max(2048)
const size = z.number().min(0).max(2048)
const style = { fill: paint, stroke: paint.optional(), strokeWidth: z.number().min(0).max(100).optional() }
const artwork = z.object({
  background: color,
  shapes: z.array(z.discriminatedUnion('shape', [
    z.object({ shape: z.literal('rect'), x: coordinate, y: coordinate, width: size, height: size, rx: size.optional(), ...style }),
    z.object({ shape: z.literal('ellipse'), cx: coordinate, cy: coordinate, rx: size, ry: size, ...style }),
    z.object({ shape: z.literal('path'), d: z.string().max(1500).regex(/^[MmZzLlHhVvCcSsQqTtAa0-9 ,.+-]+$/), ...style }),
  ])).min(1).max(65),
})

const instructions = `Design an original vector illustration on a 1024 by 1024 canvas. Output only JSON with a background (#RRGGBB) and shapes in painting order. Each shape has a shape field, fill (#RRGGBB or none), and optional stroke and strokeWidth. For rect include x, y, width, height and optional rx. For ellipse include cx, cy, rx, ry. For path include d with standard SVG path commands. Use at most 45 shapes. Favor deliberate composition and enough contrast to read at thumbnail size.`

export async function POST(req: Request) {
  const rejected = rejectRemote(req)
  if (rejected) return rejected

  const body = await req.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 1500) : ''
  if (!prompt) return Response.json({ error: 'Describe the artwork first.' }, { status: 400 })

  try {
    const data = artwork.parse(parseModelJSON(await complete(req, prompt, instructions)))
    const shapes = data.shapes.map(({ shape, strokeWidth, ...attributes }) => {
      const attrs = Object.entries(attributes).map(([name, value]) => `${name}="${value}"`)
      if (strokeWidth !== undefined) attrs.push(`stroke-width="${strokeWidth}"`)
      return `<${shape} ${attrs.join(' ')}/>`
    })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${data.background}"/>${shapes.join('')}</svg>`
    return Response.json({ image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` })
  } catch (error) {
    return chatgptError(error, 'ChatGPT could not produce a valid vector illustration. Try a simpler prompt.')
  }
}
