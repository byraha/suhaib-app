import type { Page } from 'playwright'
import type { Product } from '../types'

export async function scrapeJiomart(page: Page, query: string): Promise<Product[]> {
  const url = `https://www.jiomart.com/search/${encodeURIComponent(query)}`
  console.log(`[jiomart] navigating to ${url}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })

    const locationBtns = [
      'a:has-text("Select Location Manually")',
      'button:has-text("Select Location")',
      'a:has-text("Change")',
      '[class*="location"] a',
      '[class*="Location"] a',
    ]
    for (const sel of locationBtns) {
      try {
        const btn = await page.$(sel)
        if (btn) {
          await btn.click()
          await page.waitForTimeout(1000)
          const pincodeInput = await page.$('input[type="text"], input[placeholder*="pincode"], input[placeholder*="Pincode"], input[placeholder*="PIN"]')
          if (pincodeInput) {
            await pincodeInput.fill('560001')
            await page.keyboard.press('Enter')
            await page.waitForTimeout(2000)
          }
          break
        }
      } catch { continue }
    }

    await page.waitForTimeout(2000)

    const selectors = [
      'div.plp-card',
      'div.product-grid-item',
      'div[class*="product"]',
      'li.product-item',
      'div[class*="Product"]',
    ]

    let found = false
    for (const sel of selectors) {
      try {
        const count = await page.$$eval(sel, els => els.length)
        if (count > 0) { found = true; break }
      } catch { continue }
    }

    if (!found) {
      console.warn(`[jiomart] no product containers found`)
      return []
    }

    const combinedSelector = selectors.join(', ')
    const products = await page.$$eval(combinedSelector, (cards) => {
      return cards.slice(0, 5).map((card) => {
        const titleEl =
          card.querySelector('[class*="name"]') ||
          card.querySelector('[class*="title"]') ||
          card.querySelector('[class*="Name"]') ||
          card.querySelector('a')
        const title = titleEl?.textContent?.trim() || ''

        const priceEl = card.querySelector('[class*="price"]') || card.querySelector('[class*="Price"]')
        const priceText = priceEl?.textContent?.trim() || ''
        const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0

        const imgEl = card.querySelector('img')
        const image = imgEl?.getAttribute('src') || ''

        const linkEl = card.querySelector('a')
        const href = linkEl?.getAttribute('href') || ''
        const url = href.startsWith('http') ? href : `https://www.jiomart.com${href}`

        return { title, price, originalPrice: null, image, url, rating: null }
      }).filter(p => p.title && p.price > 0)
    })

    return products.map((p) => ({
      ...p,
      source: 'jiomart' as const,
      sourceLabel: 'Jiomart',
      delivery: '1-2 days',
    }))
  } catch (e) {
    console.warn(`[jiomart] error:`, e)
    return []
  }
}
