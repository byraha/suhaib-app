import type { Product, SearchError } from '@/lib/types'
import ProductCard from './ProductCard'

interface ComparisonViewProps {
  products: Product[]
  errors: SearchError[]
  query: string
}

export default function ComparisonView({ products, errors, query }: ComparisonViewProps) {
  if (products.length === 0 && errors.length === 0) return null

  const sourceOrder = ['amazon', 'flipkart', 'jiomart', 'blinkit', 'zepto']
  const sourceLabels: Record<string, string> = {
    amazon: 'Amazon', flipkart: 'Flipkart', jiomart: 'Jiomart', blinkit: 'Blinkit', zepto: 'Zepto',
  }

  const grouped: Record<string, Product[]> = {}
  for (const p of products) {
    if (!grouped[p.source]) grouped[p.source] = []
    grouped[p.source].push(p)
  }

  const bestPrice = products.reduce((min, p) => (p.price < min ? p.price : min), Infinity)

  const sourcesWithProducts = sourceOrder.filter((s) => grouped[s]?.length > 0)
  const sourcesWithErrors = errors.filter((e) => !sourcesWithProducts.includes(e.source))
  const failedSources = sourceOrder.filter((s) => !grouped[s] && !errors.some((e) => e.source === s))

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Results for &ldquo;{query}&rdquo;
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Found {products.length} product{products.length !== 1 ? 's' : ''} across {sourcesWithProducts.length} source{sourcesWithProducts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {sourcesWithProducts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sourcesWithProducts.map((source) => {
            const sourceProducts = grouped[source]
            const cheapestInSource = sourceProducts.reduce((min, p) => (p.price < min ? p.price : min), Infinity)
            return (
              <div key={source}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {sourceLabels[source] || source}
                  </h3>
                  <span className="text-xs text-gray-400">({sourceProducts.length})</span>
                </div>
                <div className="space-y-2">
                  {sourceProducts.map((product, idx) => (
                    <ProductCard
                      key={`${source}-${idx}`}
                      product={product}
                      isBestPrice={product.price === bestPrice}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Issues encountered:</h4>
          <ul className="space-y-1">
            {errors.map((err, idx) => (
              <li key={idx} className="text-xs text-red-600 dark:text-red-300">
                {sourceLabels[err.source] || err.source}: {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {failedSources.length > 0 && sourcesWithProducts.length === 0 && (
        <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Could not fetch results from any source. Try a different search term.
          </p>
        </div>
      )}
    </div>
  )
}
