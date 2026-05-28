import { chromium, type Browser, type Page } from 'playwright'
import type { Product, SearchError, SearchResponse } from '../types'
import { scrapeAmazon } from './amazon'
import { scrapeFlipkart } from './flipkart'
import { scrapeJiomart } from './jiomart'
import { scrapeBlinkit } from './blinkit'
import { scrapeZepto } from './zepto'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    console.log('[scraper] launching browser...')
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    console.log('[scraper] browser launched')
  }
  return browser
}

async function debugPage(page: Page, label: string): Promise<void> {
  try {
    const title = await page.title()
    const url = page.url()
    console.log(`[debug][${label}] title="${title}" url="${url}"`)
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 300) || 'no body')
    console.log(`[debug][${label}] body preview: ${bodyText.replace(/\n/g, ' ').substring(0, 200)}`)
    await page.screenshot({ path: `/tmp/debug-${label}.png`, fullPage: false }).catch(() => {})
  } catch (e) {
    console.log(`[debug][${label}] error:`, e)
  }
}

type ScraperFn = (page: Page, query: string) => Promise<Product[]>

interface ScraperDef {
  name: string
  fn: ScraperFn
}

const scrapers: ScraperDef[] = [
  { name: 'amazon', fn: scrapeAmazon },
  { name: 'flipkart', fn: scrapeFlipkart },
  { name: 'jiomart', fn: scrapeJiomart },
  { name: 'blinkit', fn: scrapeBlinkit },
  { name: 'zepto', fn: scrapeZepto },
]

export async function searchProducts(query: string): Promise<SearchResponse> {
  const browserInstance = await getBrowser()
  const errors: SearchError[] = []
  const allProducts: Product[] = []

  const results = await Promise.allSettled(
    scrapers.map(async (scraper) => {
      const context = await browserInstance.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      })
      const page = await context.newPage()

      try {
        console.log(`[scraper] starting ${scraper.name} for "${query}"`)
        const products = await scraper.fn(page, query)
        console.log(`[scraper] ${scraper.name} returned ${products.length} products`)
        allProducts.push(...products)
      } catch (err) {
        await debugPage(page, scraper.name)
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`[scraper] ${scraper.name} error: ${msg}`)
        errors.push({ source: scraper.name, error: msg })
      } finally {
        await context.close()
      }
    })
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push({ source: 'unknown', error: result.reason?.message || 'Unknown error' })
    }
  }

  return {
    query,
    products: allProducts,
    errors,
    timestamp: Date.now(),
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
    console.log('[scraper] browser closed')
  }
}
