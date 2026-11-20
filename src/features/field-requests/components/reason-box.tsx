const TEXTAREA_CLASS =
  'h-24 w-full resize-none overflow-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-ring/40 focus:ring-1 focus:ring-ring aria-invalid:border-destructive'

/** A review reason / note box with its error and character count — shared by the request screens. */
export function ReasonBox({
  id,
  label,
  required,
  value,
  onChange,
  error,
  placeholder,
  maxLength = 500,
}: {
  id: string
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  error: string | null
  placeholder: string
  maxLength?: number
}) {
  return (
    <div className="text-left">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <textarea
        id={id}
        autoFocus
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        className={TEXTAREA_CLASS}
      />
      <div id={`${id}-hint`} className="mt-1 flex justify-between gap-3 text-xs">
        <span className="text-destructive">{error}</span>
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {value.trim().length}/{maxLength}
        </span>
      </div>
    </div>
  )
}
