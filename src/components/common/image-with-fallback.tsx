import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageWithFallbackProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'src'> {
  src?: string | null
  alt: string
  /** Classes for the wrapping box (sizing, rounding, etc.). */
  wrapperClassName?: string
}

/**
 * An `<img>` that degrades gracefully: while there's no usable `src` — or the
 * image fails to load — it renders a neutral placeholder icon instead of a
 * broken-image glyph. The `src` is reset on change so a previously-failed URL
 * can recover when a new one is supplied.
 */
export function ImageWithFallback({
  src,
  alt,
  wrapperClassName,
  className,
  ...imgProps
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [src])

  const showFallback = !src || failed

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden bg-muted',
        wrapperClassName,
      )}
    >
      {showFallback ? (
        <ImageOff className="size-1/3 max-h-8 max-w-8 text-muted-foreground" />
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className={cn('size-full', className)}
          {...imgProps}
        />
      )}
    </span>
  )
}
