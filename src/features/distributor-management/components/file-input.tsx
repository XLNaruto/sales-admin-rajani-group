import { useEffect, useState } from 'react'
import { FileUploader } from 'react-drag-drop-files'
import { UploadCloud, FileText, X } from 'lucide-react'
import { mediaUrl } from '@/lib/media'

/** Does a storage path/filename point at a previewable image? */
const isImagePath = (p: string) => /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(p)

/** Last path segment, used as the thumbnail's title/alt. */
const baseName = (p: string) => p.split('/').pop() || p

/**
 * Compact drag-and-drop file field built on `react-drag-drop-files`.
 *
 * The picked `File` object(s) are surfaced via `onChange` as a `File[]` — the
 * raw files are needed so the submit flow can presign + upload them and store
 * the returned storage keys.
 *
 * Picked files render below the drop zone as square thumbnails; image files get
 * an object-URL preview, everything else a generic file icon. Each thumbnail has
 * its own close icon to remove that single file. In `multiple` mode new picks
 * are appended; otherwise they replace the current selection.
 *
 * In edit mode, `existing` holds storage paths already saved on the record;
 * they render as thumbnails (resolved to full URLs via `mediaUrl`) ahead of any
 * newly-picked files. `onRemoveExisting` drops one so the update no longer
 * retains it.
 */
export function FileInput({
  value,
  onChange,
  accept,
  multiple = false,
  existing = [],
  onRemoveExisting,
}: {
  value: File[]
  onChange: (v: File[]) => void
  accept?: string
  multiple?: boolean
  existing?: string[]
  onRemoveExisting?: (index: number) => void
}) {
  // Map an `accept` mime pattern to the extension list the library expects.
  const types = accept?.startsWith('image/')
    ? ['JPG', 'PNG', 'JPEG', 'PDF']
    : undefined

  // Human-readable list of allowed formats shown as a hint.
  const formatHint = types ? types.join(', ') : undefined

  // Object-URL previews, one per picked file — created for EVERY file (not just
  // images) so any thumbnail can open its preview in a new tab. Regenerated and
  // revoked whenever the selection changes so we never leak blob URLs.
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = value.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [value])

  const handleChange = (file: File | FileList | File[]) => {
    const files =
      file instanceof FileList
        ? Array.from(file)
        : Array.isArray(file)
          ? file
          : [file]

    onChange(multiple ? [...value, ...files] : files)
  }

  const removeAt = (index: number) =>
    onChange(value.filter((_, i) => i !== index))

  return (
    <div className="space-y-2">
      <FileUploader
        handleChange={handleChange}
        name="file"
        types={types}
        multiple={multiple}
        hoverTitle=" "
        classes="sa-file-drop"
      >
        <div className="group flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <UploadCloud className="size-3.5" />
          </span>
          <span className="flex-1 truncate leading-tight">
            {value.length > 0 ? (
              <span className="block truncate">
                <span className="font-medium text-foreground">
                  {multiple ? 'Add more' : 'Replace file'}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  · {value.length} selected
                </span>
              </span>
            ) : (
              <span className="block truncate">
                <span className="font-medium text-foreground">Click to upload</span>
                <span className="text-muted-foreground"> or drag &amp; drop</span>
              </span>
            )}
            {formatHint && (
              <span className="block truncate text-xs text-muted-foreground/70">
                {formatHint}
              </span>
            )}
          </span>
        </div>
      </FileUploader>

      {(existing.length > 0 || value.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {existing.map((path, i) => (
            <a
              key={`existing-${path}-${i}`}
              href={mediaUrl(path)}
              target="_blank"
              rel="noopener noreferrer"
              title={baseName(path)}
              className="group/thumb relative size-10 shrink-0 overflow-hidden rounded-md border border-primary/30 bg-muted/30"
            >
              {isImagePath(path) ? (
                <img
                  src={mediaUrl(path)}
                  alt={baseName(path)}
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-primary">
                  <FileText className="size-4" />
                </span>
              )}

              {onRemoveExisting && (
                <button
                  type="button"
                  title="Remove"
                  onClick={(e) => {
                    e.preventDefault()
                    onRemoveExisting(i)
                  }}
                  className="absolute top-0 right-0 grid size-4 cursor-pointer place-items-center rounded-bl-md rounded-tr-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive hover:text-white"
                >
                  <X className="size-3" />
                </button>
              )}
            </a>
          ))}
          {value.map((file, i) => (
            <a
              key={`${file.name}-${i}`}
              href={previews[i]}
              target="_blank"
              rel="noopener noreferrer"
              title={file.name}
              className="group/thumb relative size-10 shrink-0 overflow-hidden rounded-md border border-primary/30 bg-muted/30"
            >
              {file.type.startsWith('image/') && previews[i] ? (
                <img
                  src={previews[i]}
                  alt={file.name}
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-primary">
                  <FileText className="size-4" />
                </span>
              )}

              <button
                type="button"
                title="Remove"
                onClick={(e) => {
                  e.preventDefault()
                  removeAt(i)
                }}
                className="absolute top-0 right-0 grid size-4 cursor-pointer place-items-center rounded-bl-md rounded-tr-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive hover:text-white"
              >
                <X className="size-3" />
              </button>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
