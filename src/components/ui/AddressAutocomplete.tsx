import React, { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AddressResult {
  label: string
  housenumber?: string
  street?: string
  postcode?: string
  city?: string
  context?: string
}

interface AddressAutocompleteProps {
  label?: string
  value: string
  onChange: (value: string) => void
  onSelect?: (result: AddressResult) => void
  placeholder?: string
  error?: string
  required?: boolean
  className?: string
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  label,
  value,
  onChange,
  onSelect,
  placeholder = 'Rechercher une adresse...',
  error,
  required,
  className
}) => {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      )
      const data = await res.json()
      const results: AddressResult[] = data.features.map((f: any) => ({
        label: f.properties.label,
        housenumber: f.properties.housenumber,
        street: f.properties.street,
        postcode: f.properties.postcode,
        city: f.properties.city,
        context: f.properties.context
      }))
      setSuggestions(results)
      setIsOpen(results.length > 0)
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    setActiveIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  const handleSelect = (result: AddressResult) => {
    onChange(result.label)
    onSelect?.(result)
    setIsOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={wrapperRef} className={cn('w-full relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className={cn(
            'w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl',
            'bg-white text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300',
            'transition-all',
            error && 'border-red-400 focus:ring-red-500/10 focus:border-red-400'
          )}
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          {suggestions.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(result)}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2.5',
                i === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50',
                i < suggestions.length - 1 && 'border-b border-gray-100'
              )}
            >
              <MapPin className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-gray-900 truncate block">{result.label}</span>
                {result.context && (
                  <span className="text-xs text-gray-400 truncate block">{result.context}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default AddressAutocomplete
