import type { Page } from 'playwright'
import type { Product } from '../types'

const PINCODE = '560001'

export async function scrapeJiomart(page: Page, query: string): Promise<Product[]> {
  const url = `https://www.jiomart.com/search/${encodeURIComponent(query)}`

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)

    const mode = await page.evaluate(() => {
      return document.body?.innerText?.includes('Enter pin code') || document.body?.innerText?.includes('Select Location') ? 'location' : 'results'
    })

    if (mode === 'location') {
      console.log(`[jiomart] location prompt detected, trying to set pincode`)
      const manualBtn = await page.$('a:has-text("Select Location Manually"), button:has-text("Select Location"), [class*="manual"], [class*="Manual"]')
      if (manualBtn) {
        await manualBtn.click().catch(() => {})
        await page.waitForTimeout(2000)
      }

      const input = await page.$('input[type="text"], input[placeholder*="pin" i], input[placeholder*="code" i], input[placeholder*="PIN"]')
      if (input) {
        await input.fill(PINCODE)
        await page.waitForTimeout(500)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(3000)
      }
    }

    await page.waitForTimeout(2000)

    const selectors = [
      'div.plp-card',
      'li.product-item',
      'div[class*="product"]',
      'div[class*="Product"]',
      'div.product-grid-item',
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
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 200) || '')
      console.log(`[jiomart] no products found. body: ${bodyText.replace(/\n/g, ' ').substring(0, 150)}`)
      return []
    }

    const products = await page.$$eval(selectors.join(', '), (cards) => {
      return cards.slice(0, 5).map((card) => {
        const titleEl = card.querySelector('[class*="name"]') || card.querySelector('[class*="title"]') || card.querySelector('a')
        const title = titleEl?.textContent?.trim() || ''

        const priceEl = card.querySelector('[class*="price"]') || card.querySelector('[class*="Price"]')
        const priceText = priceEl?.textContent?.trim() || ''
        const priceMatch = priceText.match(/₹([\d,]+)/)
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

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
