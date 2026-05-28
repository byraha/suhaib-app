import type { Page } from 'playwright'
import type { Product } from '../types'

export async function scrapeBlinkit(page: Page, query: string): Promise<Product[]> {
  const url = `https://blinkit.com/s/${encodeURIComponent(query)}`
  console.log(`[blinkit] navigating to ${url}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })

    const locationBtns = [
      'button:has-text("Detect my location")',
      'button:has-text("Allow")',
      '[class*="location"] button',
      'button:has-text("Select Location")',
    ]

    for (const sel of locationBtns) {
      try {
        const btn = await page.$(sel)
        if (btn && await btn.isVisible()) {
          await btn.click().catch(() => {})
          await page.waitForTimeout(2000)
          break
        }
      } catch { continue }
    }

    await page.waitForTimeout(2000)

    const selectors = [
      'div[class*="ProductContainer"]',
      'div[class*="product"]',
      'div[class*="Product"]',
      'div[class*="item"]',
      'div[class*="card"]',
    ]

    let found = false
    for (const sel of selectors) {
      try {
        const count = await page.$$eval(sel, els => els.length)
        if (count > 0) { found = true; break }
      } catch { continue }
    }

    if (!found) {
      console.warn(`[blinkit] no product containers found`)
      return []
    }

    const combinedSelector = selectors.join(', ')
    const products = await page.$$eval(combinedSelector, (cards) => {
      return cards.slice(0, 5).map((card) => {
        const titleEl =
          card.querySelector('[class*="title"]') ||
          card.querySelector('[class*="name"]') ||
          card.querySelector('[class*="Title"]')
        const title = titleEl?.textContent?.trim() || ''

        const priceEl = card.querySelector('[class*="price"]') || card.querySelector('[class*="Price"]')
        const priceText = priceEl?.textContent?.trim() || ''
        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0

        const imgEl = card.querySelector('img')
        const image = imgEl?.getAttribute('src') || ''

        const linkEl = card.querySelector('a')
        const href = linkEl?.getAttribute('href') || ''
        const url = href.startsWith('http') ? href : `https://blinkit.com${href}`

        const ratingEl = card.querySelector('[class*="rating"]')
        const ratingText = ratingEl?.textContent?.trim() || ''
        const ratingMatch = ratingText.match(/([\d.]+)/)
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

        return { title, price, originalPrice: null, image, url, rating }
      }).filter(p => p.title && p.price > 0)
    })

    return products.map((p) => ({
      ...p,
      source: 'blinkit' as const,
      sourceLabel: 'Blinkit',
      delivery: '10-30 min',
    }))
  } catch (e) {
    console.warn(`[blinkit] error:`, e)
    return []
  }
}
