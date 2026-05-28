import type { Page } from 'playwright'
import type { Product } from '../types'

export async function scrapeFlipkart(page: Page, query: string): Promise<Product[]> {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`
  console.log(`[flipkart] navigating to ${url}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForSelector('div[data-id]', { timeout: 10000 })
  } catch (e) {
    console.warn(`[flipkart] timeout/error:`, e)
    return []
  }

  const products = await page.$$eval('div[data-id]', (cards) => {
    return cards.slice(0, 5).map((card) => {
      const imgEl = card.querySelector('img.UCc1lI')
      const title = imgEl?.getAttribute('alt') || ''

      const priceEl = card.querySelector('.oFEPlD')
      const priceText = priceEl?.textContent?.trim() || ''
      const priceMatch = priceText.match(/₹([\d,]+)/)
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

      const allSpans = card.querySelectorAll('span')
      let rating: number | null = null
      allSpans.forEach((s) => {
        const t = s.textContent?.trim() || ''
        if (t.match(/^[\d.]+$/) && !t.includes(' ')) {
          const parsed = parseFloat(t)
          if (parsed > 0 && parsed <= 5) rating = parsed
        }
      })

      const image = imgEl?.getAttribute('src') || ''

      const linkEl = card.querySelector('a.k7wcnx')
      const href = linkEl?.getAttribute('href') || ''
      const url = href.startsWith('http') ? href : `https://www.flipkart.com${href}`

      return { title, price, originalPrice: null, image, url, rating }
    }).filter(p => p.title && p.price > 0)
  })

  return products.map((p) => ({
    ...p,
    source: 'flipkart' as const,
    sourceLabel: 'Flipkart',
    delivery: '2-5 days',
  }))
}
