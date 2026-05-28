import type { Product } from '@/lib/types'

const sourceColors: Record<string, { bg: string; text: string; badge: string }> = {
  amazon: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200' },
  flipkart: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200' },
  jiomart: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200' },
  blinkit: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200' },
  zepto: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200' },
}

interface ProductCardProps {
  product: Product
  isBestPrice: boolean
}

export default function ProductCard({ product, isBestPrice }: ProductCardProps) {
  const colors = sourceColors[product.source] || sourceColors.amazon

  return (
    <div className={`relative rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${colors.bg} transition-shadow hover:shadow-md`}>
      {isBestPrice && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white shadow">
            Best Price
          </span>
        </div>
      )}

      <div className="flex gap-3 p-3">
        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="text-gray-400 text-xs text-center px-1">No image</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
              {product.sourceLabel}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {product.delivery}
            </span>
          </div>

          <h3 className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
            {product.title}
          </h3>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between">
            {product.rating && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ★ {product.rating.toFixed(1)}
              </span>
            )}
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              View on {product.sourceLabel} →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
