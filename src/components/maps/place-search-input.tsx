import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { useGoogleMaps } from '@/hooks/use-google-maps'
import { Input } from '@/components/ui/input'

export interface PlaceResult {
  lat: number
  lng: number
  /** Human label for the picked place (main + secondary text). */
  label: string
}

type Prediction = google.maps.places.PlacePrediction

interface PlaceSearchInputProps {
  onSelect: (result: PlaceResult) => void
  placeholder?: string
  className?: string
  /**
   * Text to show in the box, set from outside (e.g. the address after a map
   * pick). Updating it fills the input without triggering a search.
   */
  displayValue?: string
  /** Called when the box is cleared via the ✕ button. */
  onClear?: () => void
}

/**
 * Address/place search built on the Places API (New) programmatic
 * `AutocompleteSuggestion` API, rendered with the app's own `<Input>` + a
 * themed dropdown (so it matches every other field in light and dark mode).
 * Shared by the geo-location field and its map dialog.
 */
export function PlaceSearchInput({
  onSelect,
  placeholder = 'Search for a place, area or address…',
  className,
  displayValue,
  onClear,
}: PlaceSearchInputProps) {
  const { ready } = useGoogleMaps()
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [listOpen, setListOpen] = useState(false)
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Set when a prediction is picked, so the query change it causes doesn't
  // re-trigger the fetch and reopen the list.
  const skipNextFetch = useRef(false)

  // Fill the box from outside (e.g. address after a map pick) without searching.
  useEffect(() => {
    if (displayValue === undefined) return
    skipNextFetch.current = true
    setQuery(displayValue)
    setListOpen(false)
    setPredictions([])
  }, [displayValue])

  // Debounced prediction fetch.
  useEffect(() => {
    if (!ready) return
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    const q = query.trim()
    if (q.length < 2) {
      setPredictions([])
      setListOpen(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        if (!tokenRef.current) {
          tokenRef.current = new google.maps.places.AutocompleteSessionToken()
        }
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: q,
            sessionToken: tokenRef.current,
          })
        setPredictions(
          suggestions
            .map((s) => s.placePrediction)
            .filter((p): p is Prediction => Boolean(p)),
        )
        setListOpen(true)
      } catch {
        setPredictions([])
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, ready])

  const choose = async (pred: Prediction) => {
    const main = pred.mainText?.text ?? pred.text?.text ?? ''
    const secondary = pred.secondaryText?.text ?? ''
    skipNextFetch.current = true
    setQuery(main)
    setListOpen(false)
    setPredictions([])
    inputRef.current?.blur() // drop focus so the list can't reopen
    const place = pred.toPlace()
    await place.fetchFields({ fields: ['location'] })
    tokenRef.current = null // end the billing session after a pick
    if (place.location) {
      onSelect({
        lat: place.location.lat(),
        lng: place.location.lng(),
        label: [main, secondary].filter(Boolean).join(', '),
      })
    }
  }

  return (
    <div className={`relative min-w-0 ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => predictions.length > 0 && setListOpen(true)}
        onBlur={() => setTimeout(() => setListOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault()
          if (e.key === 'Escape') setListOpen(false)
        }}
        placeholder={placeholder}
        className="pl-8 pr-9"
        disabled={!ready}
      />
      {query ? (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            setQuery('')
            setPredictions([])
            setListOpen(false)
            inputRef.current?.focus()
            onClear?.()
          }}
          title="Clear search"
          className="absolute right-2 top-1/2 z-10 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
      {listOpen && predictions.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                // onMouseDown fires before the input's onBlur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(p)
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">
                    {p.mainText?.text ?? p.text?.text}
                  </span>
                  {p.secondaryText?.text ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.secondaryText.text}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
