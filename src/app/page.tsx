'use client'

import { useState, useCallback } from 'react'
import type { SearchResponse } from '@/lib/types'
import SearchBar from '@/components/SearchBar'
import ComparisonView from '@/components/ComparisonView'

export default function Home() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (searchQuery: string) => {
    setLoading(true)
    setResults(null)
    setSearched(true)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setResults({
          query: searchQuery,
          products: [],
          errors: [{ source: 'api', error: err.error || 'Unknown error' }],
          timestamp: Date.now(),
        })
        return
      }
      const data: SearchResponse = await res.json()
      setResults(data)
    } catch (err) {
      setResults({
        query: searchQuery,
        products: [],
        errors: [{ source: 'network', error: err instanceof Error ? err.message : 'Network error' }],
        timestamp: Date.now(),
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const suggestions = [
    'iPhone 15',
    'Samsung Galaxy S24',
    'Nike Air Force',
    'MacBook Air',
    'boAt Airdopes',
    'Dove Shampoo',
  ]

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-8 sm:py-12">
      <header className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-blue-600 dark:text-blue-400">Suhaib</span>{' '}
          <span className="text-gray-900 dark:text-gray-100">Commerce</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Compare prices across Amazon, Flipkart, Jiomart, Blinkit & Zepto
        </p>
      </header>

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        onSubmit={doSearch}
        loading={loading}
      />

      {loading && (
        <div className="w-full max-w-5xl mx-auto mt-12 space-y-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Searching across 5 stores...
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && !loading && (
        <ComparisonView
          products={results.products}
          errors={results.errors}
          query={results.query}
        />
      )}

      {!searched && !loading && (
        <div className="mt-16 text-center">
          <div className="text-6xl mb-4 opacity-30">🛒</div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Search any product to compare prices across top Indian e-commerce stores
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion)
                  doSearch(suggestion)
                }}
                className="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-auto pt-12 pb-4 text-xs text-gray-400 dark:text-gray-600 text-center">
        Suhaib Commerce — Price comparison MVP
      </footer>
    </div>
  )
}
