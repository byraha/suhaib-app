import { NextRequest } from 'next/server'
import { searchProducts } from '@/lib/scrapers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return Response.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const results = await searchProducts(query.trim())
    return Response.json(results)
  } catch (err) {
    console.error('[api/search] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
