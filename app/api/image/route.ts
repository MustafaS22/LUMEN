/**
 * POST /api/image — REAL image generation via Gemini's image model.
 *
 * Body: { prompt: string }
 * Returns: { image: string } — a data URL ready for an <img> src.
 */

import { generateImage } from 'ai'
import { google } from '@ai-sdk/google'

export const maxDuration = 60

export async function POST(req: Request) {
  let body: { prompt?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 1500) : ''
  if (!prompt) {
    return Response.json({ error: 'Missing prompt' }, { status: 400 })
  }

  try {
    const { image } = await generateImage({
      model: google.image('gemini-2.5-flash-image'),
      prompt,
      maxRetries: 1,
    })

    return Response.json({
      image: `data:${image.mediaType};base64,${image.base64}`,
    })
  } catch (error) {
    console.error('Image generation failed:', error)
    // Free-tier Gemini keys have ZERO quota for image models ("limit: 0").
    // Detect that case and tell the user the truth instead of a vague error.
    const message = error instanceof Error ? error.message : String(error)
    if (/limit:\s*0|RESOURCE_EXHAUSTED|quota/i.test(message)) {
      return Response.json(
        {
          error: 'quota',
          detail:
            'Your Gemini API key does not include image generation (free tier has no image quota). Enable billing on your key at aistudio.google.com to unlock it.',
        },
        { status: 402 },
      )
    }
    return Response.json({ error: 'Image generation unavailable' }, { status: 500 })
  }
}
