import type { Page } from 'playwright'
import type { Product } from '../types'

export async function scrapeAmazon(page: Page, query: string): Promise<Product[]> {
  const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 })
  } catch (e) {
    console.warn(`[amazon] timeout:`, e)
    return []
  }

  const products = await page.$$eval(
    '[data-component-type="s-search-result"]',
    (cards) => {
      return cards.slice(0, 5).map((card) => {
        const h2s = card.querySelectorAll('h2')
        let title = ''
        if (h2s.length >= 2) {
          title = h2s[1]?.textContent?.trim() || ''
        }
        if (!title || title.length < 10) {
          title = h2s[0]?.textContent?.trim() || ''
        }

        const priceEl = card.querySelector('.a-price .a-offscreen') || card.querySelector('.a-price-whole')
        const priceText = priceEl?.textContent?.trim() || ''
        const priceMatch = priceText.match(/₹?([\d,]+)/)
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

        const origPriceEl = card.querySelector('.a-text-price span.a-offscreen')
        const origText = origPriceEl?.textContent?.trim() || ''
        const origMatch = origText.match(/₹?([\d,]+)/)
        const originalPrice = (origMatch && parseFloat(origMatch[1].replace(/,/g, ''))) || null

        const imgEl = card.querySelector('img.s-image')
        const image = imgEl?.getAttribute('src') || ''

        const linkEl = card.querySelector('a[href*="/dp/"]') || card.querySelector('a[href*="/product/"]') || card.querySelector('a[href*="/sspa/"]')
        const href = linkEl?.getAttribute('href') || ''
        const url = href.startsWith('http') ? href : `https://www.amazon.in${href}`

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
