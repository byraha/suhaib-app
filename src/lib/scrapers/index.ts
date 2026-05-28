import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'
import type { Product, SearchError, SearchResponse } from '../types'
import { scrapeAmazon } from './amazon'
import { scrapeFlipkart } from './flipkart'
import { scrapeJiomart } from './jiomart'
import { scrapeBlinkit } from './blinkit'
import { scrapeZepto } from './zepto'

let browser: Browser | null = null

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
]

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    console.log('[scraper] launching browser...')
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })
    console.log('[scraper] browser launched')
  }
  return browser
}

async function createPage(browserInstance: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browserInstance.newContext({
    userAgent: randomUA(),
    viewport: { width: 1920, height: 1080 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    geolocation: { latitude: 12.9716, longitude: 77.5946 },
    permissions: ['geolocation'],
  })

  const page = await context.newPage()

  await page.route('**/*.{png,jpg,jpeg,gif,svg,ico,webp,avif,woff,woff2,ttf,eot,otf}', (route) => route.abort())
  await page.route('**/analytics/**', (route) => route.abort())
  await page.route('**/track/**', (route) => route.abort())
  await page.route('**/collect', (route) => route.abort())

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  })

  return { context, page }
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
      const { context, page } = await createPage(browserInstance)
      try {
        console.log(`[scraper] starting ${scraper.name} for "${query}"`)
        const products = await scraper.fn(page, query)
        console.log(`[scraper] ${scraper.name} returned ${products.length} products`)
        allProducts.push(...products)
      } catch (err) {
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
