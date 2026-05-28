export interface Product {
  title: string
  price: number
  originalPrice: number | null
  image: string
  source: 'amazon' | 'flipkart' | 'jiomart' | 'blinkit' | 'zepto'
  sourceLabel: string
  url: string
  rating: number | null
  delivery: string
}

export interface SearchError {
  source: string
  error: string
}

export interface SearchResponse {
  query: string
  products: Product[]
  errors: SearchError[]
  timestamp: number
}
