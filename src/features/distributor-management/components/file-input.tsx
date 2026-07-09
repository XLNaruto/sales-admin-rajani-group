import { useEffect, useState } from 'react'
import { FileUploader } from 'react-drag-drop-files'
import { UploadCloud, FileText, X } from 'lucide-react'

/**
 * Compact drag-and-drop file field built on `react-drag-drop-files`. Kept to a
 * single-row height so it lines up with the text inputs in the form grid. The
 * picked file name(s) are surfaced as a plain string via `onChange` (mock
 * behaviour — no upload). Clears with the X.
 *
 * Image files also get a small object-URL thumbnail preview (local state only),
 * shown in the filled chip in place of the generic file icon.
 */
export function FileInput({
  value,
  onChange,
  accept,
  multiple = false,
}: {
  value: string
  onChange: (v: string) => void
  accept?: string
  multiple?: boolean
}) {
  // Map an `accept` mime pattern to the extension list the library expects.
  const types = accept?.startsWith('image/')
    ? ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF']
    : undefined

  // Object-URL previews for the most recently picked image files. Revoked on
  // replace/clear/unmount so we don't leak blob URLs.
  const [previews, setPreviews] = useState<string[]>([])

  const revoke = (urls: string[]) => urls.forEach((u) => URL.revokeObjectURL(u))

  useEffect(() => () => revoke(previews), [previews])

  // If the value is cleared externally, drop any stale previews.
  useEffect(() => {
    if (!value) setPreviews((prev) => (revoke(prev), []))
  }, [value])

  const handleChange = (file: File | FileList | File[]) => {
    const files =
      file instanceof FileList
        ? Array.from(file)
        : Array.isArray(file)
          ? file
          : [file]

    setPreviews((prev) => {
      revoke(prev)
      return files
        .filter((f) => f.type.startsWith('image/'))
        .map((f) => URL.createObjectURL(f))
    })
    onChange(files.map((f) => f.name).join(', '))
  }

  return (
    // `relative` so the clear button can sit OUTSIDE the FileUploader's label.
    // The library binds a native `click` listener on the label that opens the
    // browse dialog; a button rendered as its child can't reliably stop that,
    // so we overlay the button as a sibling instead.
    <div className="relative">
      <FileUploader
        handleChange={handleChange}
        name="file"
        types={types}
        multiple={multiple}
        hoverTitle=" "
        classes="sa-file-drop"
      >
        {value ? (
          <div className="flex h-9 cursor-pointer items-center gap-2 overflow-hidden rounded-md border-2 border-dashed border-primary/40 bg-muted/40 py-1 pr-9 pl-3 text-sm transition-colors hover:border-primary/60">
            {previews.length > 0 ? (
              <span className="flex shrink-0 items-center -space-x-2">
                {previews.slice(0, 3).map((url, i) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="size-6 shrink-0 rounded border border-background bg-background object-cover shadow-sm"
                    style={{ zIndex: previews.length - i }}
                  />
                ))}
              </span>
            ) : (
              <FileText className="size-4 shrink-0 text-primary" />
            )}
            <span className="flex-1 truncate">{value}</span>
          </div>
        ) : (
          <div className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-input px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40">
            <UploadCloud className="size-4 shrink-0" />
            <span className="flex-1 truncate">
              <span className="font-medium text-primary">Click to upload</span> or drag &amp; drop
            </span>
          </div>
        )}
      </FileUploader>

      {value && (
        <button
          type="button"
          title="Clear"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
