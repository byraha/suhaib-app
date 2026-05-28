import type { Page } from 'playwright'
import type { Product } from '../types'

export async function scrapeAmazon(page: Page, query: string): Promise<Product[]> {
  const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`
  console.log(`[amazon] navigating to ${url}`)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 })
  } catch (e) {
    console.warn(`[amazon] timeout/error:`, e)
    return []
  }

  const products = await page.$$eval(
    '[data-component-type="s-search-result"]',
    (cards) => {
      return cards.slice(0, 5).map((card) => {
        const allH2s = card.querySelectorAll('h2')
        const titleFromH2 = allH2s.length >= 2
          ? allH2s[1]?.textContent?.trim()
          : allH2s[0]?.textContent?.trim()
        const title = titleFromH2 || card.querySelector('h2 a')?.textContent?.trim() || ''

        const priceEl = card.querySelector('.a-price .a-offscreen') || card.querySelector('.a-price-whole')
        const priceText = priceEl?.textContent?.trim() || ''
        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0

        const origPriceEl = card.querySelector('.a-text-price span.a-offscreen')
        const origPriceText = origPriceEl?.textContent?.trim() || ''
        const originalPrice = parseFloat(origPriceText.replace(/[^0-9.]/g, '')) || null

        const imgEl = card.querySelector('img.s-image')
        const image = imgEl?.getAttribute('src') || ''

        const linkEl = card.querySelector('a[href*="/dp/"]') || card.querySelector('a[href*="product"]') || card.querySelector('h2 a')
        const relativeUrl = linkEl?.getAttribute('href') || ''
        const url = relativeUrl.startsWith('http') ? relativeUrl : `https://www.amazon.in${relativeUrl}`

        const ratingEl = card.querySelector('span.a-icon-alt')
        const ratingText = ratingEl?.textContent?.trim() || ''
        const ratingMatch = ratingText.match(/([\d.]+)/)
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

        return { title, price, originalPrice, image, url, rating }
      }).filter(p => p.title && p.title.length > 5 && p.price > 0)
    }
  )

  return products.map((p) => ({
    ...p,
    source: 'amazon' as const,
    sourceLabel: 'Amazon',
    delivery: '2-7 days',
  }))
}
