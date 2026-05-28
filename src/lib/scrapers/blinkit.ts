import type { Page } from 'playwright'
import type { Product } from '../types'

const PINCODE = '560001'

export async function scrapeBlinkit(page: Page, query: string): Promise<Product[]> {
  const url = `https://blinkit.com/s/${encodeURIComponent(query)}`

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)

    const needsLocation = await page.evaluate(() => {
      const text = document.body?.innerText || ''
      return text.includes('Select Location') || text.includes('delivery location') || text.includes('Detect my location')
    })

    if (needsLocation) {
      console.log(`[blinkit] location prompt detected, trying to set pincode`)

      const detectBtn = await page.$('button:has-text("Detect my location"), button:has-text("Select Location")')
      if (detectBtn) {
        await detectBtn.click().catch(() => {})
        await page.waitForTimeout(3000)
      }

      const input = await page.$('input[type="text"]')
      if (input) {
        await input.fill(PINCODE)
        await page.waitForTimeout(500)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(3000)
      }
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
      console.log(`[blinkit] no products found (likely still at location prompt)`)
      return []
    }

    const products = await page.$$eval(selectors.join(', '), (cards) => {
      return cards.slice(0, 5).map((card) => {
        const titleEl = card.querySelector('[class*="title"]') || card.querySelector('[class*="name"]') || card.querySelector('[class*="Title"]')
        const title = titleEl?.textContent?.trim() || ''

        const priceEl = card.querySelector('[class*="price"]') || card.querySelector('[class*="Price"]')
        const priceText = priceEl?.textContent?.trim() || ''
        const priceMatch = priceText.match(/₹([\d,]+)/)
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

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
