import { ImageOff } from 'lucide-react'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { PreviewTrigger, type PreviewFile } from '@/components/common/file-preview-lightbox'
import { mediaUrl } from '@/lib/media'

/** A short note in place of thumbnails (nothing captured / unchanged / cleared). */
function Note({ children, tone = 'muted' }: { children: string; tone?: 'muted' | 'warning' }) {
  return (
    <p
      className={
        tone === 'warning'
          ? 'rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-4 text-center text-xs text-amber-700 dark:text-amber-400'
          : 'flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground'
      }
    >
      {tone === 'muted' ? <ImageOff className="size-3.5" /> : null}
      {children}
    </p>
  )
}

interface Props {
  /** S3 keys to show. */
  keys: string[]
  /** What the gallery is, for alt text and the lightbox title. */
  label: string
  /** Shown when `keys` is empty. */
  emptyNote?: string
  /** Render `emptyNote` as a warning (e.g. "will be cleared"). */
  emptyIsWarning?: boolean
}

/** A row of face thumbnails; any one opens the whole set in the lightbox. */
export function FaceImageStrip({ keys, label, emptyNote = 'No images', emptyIsWarning }: Props) {
  if (keys.length === 0) {
    return <Note tone={emptyIsWarning ? 'warning' : 'muted'}>{emptyNote}</Note>
  }

  const files: PreviewFile[] = keys.map((key, i) => ({
    src: key,
    name: `${label} ${i + 1}`,
  }))

  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((key, i) => (
        <PreviewTrigger
          key={`${key}-${i}`}
          files={files}
          index={i}
          label={`Preview ${label.toLowerCase()} ${i + 1}`}
          className="rounded-lg ring-offset-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ImageWithFallback
            src={mediaUrl(key)}
            alt={`${label} ${i + 1}`}
            loading="lazy"
            wrapperClassName="size-20 rounded-lg border border-border/60"
            className="object-cover"
          />
        </PreviewTrigger>
      ))}
    </div>
  )
}
