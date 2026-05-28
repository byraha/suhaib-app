import type { Page } from 'playwright'
import type { Product } from '../types'

export async function scrapeZepto(page: Page, query: string): Promise<Product[]> {
  const url = `https://www.zepto.com/search?q=${encodeURIComponent(query)}`
  console.log(`[zepto] navigating to ${url}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForSelector('a.B4vNQ', { timeout: 10000 })
  } catch (e) {
    console.warn(`[zepto] timeout/error:`, e)
    return []
  }

  const products = await page.$$eval('a.B4vNQ', (cards) => {
    return cards.slice(0, 5).map((card) => {
      const imgEl = card.querySelector('img')
      const title = imgEl?.getAttribute('alt') || card.textContent?.replace(/ADD|OFF|₹[\d,]+/g, '').trim().substring(0, 100) || ''

      const text = card.textContent || ''
      const priceMatches = text.match(/₹([\d,]+)/g)
      const prices = priceMatches?.map(p => parseFloat(p.replace(/[₹,]/g, ''))) || []
      const price = prices[0] || 0
      const originalPrice = prices.length > 1 && prices[1] > price ? prices[1] : null

      const image = imgEl?.getAttribute('src') || ''
      const href = card.getAttribute('href') || ''
      const url = href.startsWith('http') ? href : `https://www.zepto.com${href}`

      return { title, price, originalPrice, image, url, rating: null }
    }).filter(p => p.title && p.price > 0)
  })

  return products.map((p) => ({
    ...p,
    source: 'zepto' as const,
    sourceLabel: 'Zepto',
    delivery: '10-20 min',
  }))
}
