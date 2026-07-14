import { useEffect, useState } from 'react'
import { FileUploader } from 'react-drag-drop-files'
import { UploadCloud, FileText, X } from 'lucide-react'

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
 */
export function FileInput({
  value,
  onChange,
  accept,
  multiple = false,
}: {
  value: File[]
  onChange: (v: File[]) => void
  accept?: string
  multiple?: boolean
}) {
  // Map an `accept` mime pattern to the extension list the library expects.
  const types = accept?.startsWith('image/')
    ? ['JPG', 'PNG', 'JPEG', 'PDF']
    : undefined

  // Human-readable list of allowed formats shown as a hint.
  const formatHint = types ? types.join(', ') : undefined

  // Object-URL previews, one per file (null for non-image files). Regenerated
  // and revoked whenever the selection changes so we never leak blob URLs.
  const [previews, setPreviews] = useState<(string | null)[]>([])

  useEffect(() => {
    const urls = value.map((f) =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    )
    setPreviews(urls)
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u))
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

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              title={file.name}
              className="group/thumb relative size-10 shrink-0 overflow-hidden rounded-md border border-primary/30 bg-muted/30"
            >
              {previews[i] ? (
                <img
                  src={previews[i] as string}
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
                onClick={() => removeAt(i)}
                className="absolute top-0 right-0 grid size-4 cursor-pointer place-items-center rounded-bl-md rounded-tr-md bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive hover:text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
