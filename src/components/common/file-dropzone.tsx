import { FileUploader } from 'react-drag-drop-files'
import { FileText, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toasterrormsg } from '@/lib/toast'
import { mediaUrl } from '@/lib/media'
import { ImageWithFallback } from './image-with-fallback'

export interface DropzoneFile {
  name: string
  url: string
  /** The raw File for a freshly picked item; absent for already-stored files. */
  file?: File
}

interface FileDropzoneProps {
  value: DropzoneFile | null
  onChange: (value: DropzoneFile | null) => void
  accept?: string
  maxSizeMB?: number
  label?: string
  hint?: string
  className?: string
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const isImage = (f: DropzoneFile) =>
  f.url.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f.name)

/**
 * Translate an `accept` mime/extension string into the uppercase extension list
 * `react-drag-drop-files` expects (e.g. `image/*` → JPG/PNG/…). Returns
 * `undefined` (accept anything) when nothing usable is given.
 */
function acceptToTypes(accept?: string): string[] | undefined {
  if (!accept) return undefined
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  const types = new Set<string>()
  for (const token of tokens) {
    if (token === 'image/*') ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG', 'AVIF'].forEach((t) => types.add(t))
    else if (token === 'application/pdf' || token === '.pdf') types.add('PDF')
    else if (token.startsWith('.')) types.add(token.slice(1).toUpperCase())
  }
  return types.size ? Array.from(types) : undefined
}

/**
 * Single-file drag-and-drop field built on `react-drag-drop-files`. Picked
 * files are surfaced as a {@link DropzoneFile} (name + data-URL + raw `File`).
 * Images preview as a cover thumbnail; other files show a document tile.
 */
export function FileDropzone({
  value,
  onChange,
  accept = 'image/*',
  maxSizeMB,
  label = 'Upload file',
  hint,
  className,
}: FileDropzoneProps) {
  const types = acceptToTypes(accept)

  const take = async (file: File) => {
    onChange({ name: file.name, url: await readAsDataUrl(file), file })
  }

  // Once a file is chosen we render a plain preview with NO <FileUploader> at
  // all — the library wraps its children in a <label> whose hidden input can
  // re-open the picker on any click (even for a nested "remove" button). To
  // replace a file, remove it first and the empty dropzone returns.
  if (value) {
    return (
      <div
        className={cn(
          'relative h-32 w-full overflow-hidden rounded-lg border-2 border-solid border-border bg-transparent',
          className,
        )}
      >
        {isImage(value) ? (
          <>
            <ImageWithFallback
              src={mediaUrl(value.url)}
              alt={value.name}
              wrapperClassName="absolute inset-0 h-full w-full"
              className="object-contain"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/70 to-transparent px-3 py-2 pr-10 text-left text-xs font-medium text-white">
              {value.name}
            </span>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-background text-primary">
              <FileText className="size-6" />
            </span>
            <span className="max-w-full truncate text-sm font-medium text-foreground">
              {value.name}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Remove file"
          className="absolute right-2 top-2 z-10 flex size-7 cursor-pointer items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <FileUploader
      handleChange={(file: File | File[]) => {
        const picked = Array.isArray(file) ? file[0] : file
        if (picked) void take(picked)
      }}
      name="file"
      types={types}
      multiple={false}
      maxSize={maxSizeMB}
      hoverTitle=" "
      onTypeError={() => toasterrormsg('That file type is not supported.')}
      onSizeError={() =>
        toasterrormsg(`File is too large. Maximum size is ${maxSizeMB} MB.`)
      }
      dropMessageStyle={{ display: 'none' }}
      classes="sa-file-drop"
    >
      <div
        className={cn(
          'flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-transparent px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5',
          className,
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </FileUploader>
  )
}
