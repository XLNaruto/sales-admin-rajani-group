import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download as DownloadIcon,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Minus,
  Plus,
  Scan,
  X,
} from 'lucide-react'
import Lightbox, {
  useController,
  useLightboxState,
  type Slide,
  type ZoomRef,
} from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import { Hint } from '@/components/common/hint'
import { mediaUrl } from '@/lib/media'
import { claimEscape } from '@/lib/overlay-stack'
import { LIGHTBOX_Z } from '@/lib/z-layers'
import { cn } from '@/lib/utils'

/**
 * One attachment to show in the lightbox.
 *
 * `src` is whatever the record/form holds — a storage path, an absolute URL, a
 * `data:` URL or a `blob:` URL; it is resolved through {@link mediaUrl}. When
 * the item comes from a freshly picked file, pass the raw `file` too: PDFs are
 * rendered in an `<iframe>`, and browsers refuse to frame a `data:` URL, so the
 * lightbox re-derives a short-lived `blob:` URL from the File instead.
 */
export interface PreviewFile {
  src: string
  name?: string
  file?: File
}

/** Extensions we can render inline as an image. */
const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|#|$)/i

type PreviewKind = 'image' | 'pdf' | 'other'

/** Classify an item from its file name, mime type or URL shape. */
function kindOf(item: PreviewFile): PreviewKind {
  const type = item.file?.type ?? ''
  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf') return 'pdf'

  const probe = `${item.name ?? ''} ${item.src}`
  if (item.src.startsWith('data:image') || IMAGE_RE.test(probe)) return 'image'
  if (item.src.startsWith('data:application/pdf') || /\.pdf(\?|#|$)/i.test(probe))
    return 'pdf'
  return 'other'
}

/** Last path segment, used when the caller gave no explicit name. */
const baseName = (p: string) => p.split(/[?#]/)[0].split('/').pop() || 'File'

/*
 * Custom slide types. `yet-another-react-lightbox` only knows how to paint
 * images out of the box; declaring the extra types here lets `render.slide`
 * take over for PDFs and everything else while keeping the built-in image
 * slide (and the zoom plugin) untouched.
 */
interface DocSlide {
  type: 'pdf' | 'file'
  src: string
  title: string
  /** Original source, so "open in a new tab" still points at the stored file. */
  href: string
}

declare module 'yet-another-react-lightbox' {
  interface SlideTypes {
    pdf: DocSlide
    file: DocSlide
  }
}

interface FilePreviewLightboxProps {
  items: PreviewFile[]
  /** Index of the item to show; `null`/negative keeps the lightbox closed. */
  index: number | null
  onClose: () => void
}

/**
 * Full-screen preview for image and document attachments.
 *
 * Images get the real lightbox treatment — pinch/scroll zoom, arrow-key and
 * swipe navigation, a thumbnail strip and a download button. PDFs render inline
 * in an iframe on the same carousel, and anything else falls back to a card
 * with a link out. Escape / backdrop click closes.
 *
 * The chrome (toolbar, arrows, title bar) is all ours rather than the library's
 * default: same icon set, button shape and `Hint` tooltips as the rest of the
 * app, so the overlay doesn't read like a third-party widget.
 */
export function FilePreviewLightbox({
  items,
  index,
  onClose,
}: FilePreviewLightboxProps) {
  if (index === null || index < 0 || index >= items.length) return null
  // Remounted per open (see `key`) so the slides — and the object URLs some of
  // them mint — are built once per session and torn down on close.
  return (
    <LightboxContent
      key={index}
      items={items}
      index={index}
      onClose={onClose}
    />
  )
}

/** Build the slide list, collecting any object URLs that need revoking later. */
function buildSlides(items: PreviewFile[]) {
  const created: string[] = []

  const built = items.map((item) => {
    const kind = kindOf(item)
    const title = item.name ?? baseName(item.src)
    const href = mediaUrl(item.src)

    if (kind === 'image') return { src: href, alt: title, title, download: href }

    // Freshly-picked files carry a `data:` URL, which browsers refuse to frame;
    // an object URL off the raw File does work.
    let src = href
    if (item.file && href.startsWith('data:')) {
      src = URL.createObjectURL(item.file)
      created.push(src)
    }
    return { type: kind === 'pdf' ? 'pdf' : 'file', src, title, href } as DocSlide
  })

  return { built, created }
}

/** The address a slide's toolbar actions (open / download) should point at. */
function slideHref(slide: Slide | undefined) {
  if (!slide) return ''
  return slide.type === 'pdf' || slide.type === 'file' ? slide.href : (slide.src ?? '')
}

/** The label shown in the title bar and used as the download file name. */
function slideTitle(slide: Slide | undefined) {
  const title = (slide as { title?: string } | undefined)?.title
  return title ?? (slide ? baseName(slideHref(slide)) : 'File')
}

/**
 * Save a file locally. Streaming it through a blob keeps the original name and
 * avoids a stray tab; when the host blocks the fetch (cross-origin media
 * without CORS) we fall back to a plain anchor and let the browser decide.
 */
async function downloadFile(url: string, name: string) {
  const save = (href: string) => {
    const a = document.createElement('a')
    a.href = href
    a.download = name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(String(response.status))
    const objectUrl = URL.createObjectURL(await response.blob())
    save(objectUrl)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
  } catch {
    save(url)
  }
}

/**
 * One piece of lightbox chrome: a square glass button with a tooltip. Shared by
 * the toolbar and the navigation arrows so every control has the same weight.
 */
function ChromeButton({
  label,
  onClick,
  disabled,
  href,
  className,
  children,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  /** Renders an anchor instead of a button (opens in a new tab). */
  href?: string
  className?: string
  children: ReactNode
}) {
  const classes = cn(
    'grid size-9 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80 backdrop-blur-sm transition',
    'hover:border-white/25 hover:bg-white/15 hover:text-white',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60',
    'disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white/80',
    className,
  )

  return (
    <Hint label={label} side="bottom">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={classes}
        >
          {children}
        </a>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={classes}
        >
          {children}
        </button>
      )}
    </Hint>
  )
}

/** Zoom cluster — replaces the plugin's own button; hidden on document slides. */
function ZoomControls({ zoom, minZoom, maxZoom, disabled, zoomIn, zoomOut, changeZoom }: ZoomRef) {
  if (disabled) return null

  return (
    <>
      <ChromeButton label="Zoom out" onClick={zoomOut} disabled={zoom <= minZoom}>
        <Minus className="size-4" />
      </ChromeButton>
      {/* The live zoom level doubles as "reset to fit" — the only way back to
          1× without spinning the wheel all the way down. */}
      <Hint label="Reset zoom" side="bottom">
        <button
          type="button"
          onClick={() => changeZoom(minZoom)}
          disabled={zoom <= minZoom}
          aria-label="Reset zoom"
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-medium tabular-nums text-white/80 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/5"
        >
          <Scan className="size-3.5" />
          {Math.round(zoom * 100)}%
        </button>
      </Hint>
      <ChromeButton label="Zoom in" onClick={zoomIn} disabled={zoom >= maxZoom}>
        <Plus className="size-4" />
      </ChromeButton>
    </>
  )
}

/** Open-in-new-tab + download, for whichever slide is showing. */
function SlideActions() {
  const { currentSlide } = useLightboxState()
  const href = slideHref(currentSlide)
  if (!href) return null
  const name = slideTitle(currentSlide)

  return (
    <>
      <ChromeButton label="Open in a new tab" href={href}>
        <ExternalLink className="size-4" />
      </ChromeButton>
      <ChromeButton label="Download" onClick={() => void downloadFile(href, name)}>
        <DownloadIcon className="size-4" />
      </ChromeButton>
    </>
  )
}

/** Title bar: what you're looking at, and where you are in the set. */
function TitleBar({ count }: { count: number }) {
  const { currentSlide, currentIndex } = useLightboxState()
  const isDoc = currentSlide?.type === 'pdf' || currentSlide?.type === 'file'

  return (
    // Left half of the top band; the toolbar owns the right half, so this stops
    // well short of it instead of running underneath.
    <div className="pointer-events-none absolute top-0 left-0 flex h-16 max-w-[calc(100%-22rem)] items-center gap-2.5 px-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/10 text-white/85 backdrop-blur-sm">
        {isDoc ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-white/95">
        {slideTitle(currentSlide)}
      </span>
      {count > 1 && (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium tabular-nums text-white/85 backdrop-blur-sm">
          {currentIndex + 1} / {count}
        </span>
      )}
    </div>
  )
}

/** Prev/next arrows — same glass button, larger, vertically centred. */
function NavButton({ direction, count }: { direction: 'prev' | 'next'; count: number }) {
  const { prev, next } = useController()
  const { currentIndex } = useLightboxState()

  const isPrev = direction === 'prev'
  const disabled = isPrev ? currentIndex === 0 : currentIndex === count - 1

  return (
    <div
      className={cn(
        'absolute top-1/2 z-10 -translate-y-1/2',
        isPrev ? 'left-3' : 'right-3',
      )}
    >
      <ChromeButton
        label={isPrev ? 'Previous' : 'Next'}
        onClick={isPrev ? prev : next}
        disabled={disabled}
        className="size-11 bg-black/30"
      >
        {isPrev ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
      </ChromeButton>
    </div>
  )
}

function LightboxContent({
  items,
  index,
  onClose,
}: FilePreviewLightboxProps & { index: number }) {
  // Snapshot on mount: the attachment list can't change while the overlay is up,
  // and freezing it keeps the object URLs stable across re-renders.
  const [slides] = useState(() => buildSlides(items))

  useEffect(
    () => () => slides.created.forEach((u) => URL.revokeObjectURL(u)),
    [slides],
  )

  // Escape peels one layer at a time: while the viewer is up it owns the key, so
  // the modal it was opened from stays put until a second press. Ownership is
  // handed back the moment the close animation starts, not when it ends.
  const releaseEscape = useRef<(() => void) | null>(null)
  useEffect(() => {
    releaseEscape.current = claimEscape()
    return () => releaseEscape.current?.()
  }, [])

  const count = slides.built.length
  const multiple = count > 1

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides.built}
      plugins={[Zoom, ...(multiple ? [Thumbnails] : [])]}
      className="sa-lightbox"
      // Uniform inset so the artwork never slides under the top band or the
      // thumbnail strip — the slide rect is computed from this single value.
      carousel={{ finite: true, padding: 76 }}
      controller={{ closeOnBackdropClick: true }}
      on={{ exiting: () => releaseEscape.current?.() }}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      thumbnails={{ width: 96, height: 72, border: 0, gap: 8, padding: 4 }}
      // Sits above the app's modals but below its tooltips, so the chrome's
      // hints stay readable (see `@/lib/z-layers`).
      styles={{
        root: {
          '--yarl__portal_zindex': LIGHTBOX_Z,
          // One backdrop colour for the slide area AND the thumbnail strip, so
          // the overlay reads as a single surface. Deliberately short of opaque:
          // the app stays faintly visible, which keeps the viewer feeling like a
          // layer over the page rather than a separate screen.
          '--yarl__color_backdrop': 'rgba(24, 24, 27, .82)',
        },
        toolbar: { padding: '14px 16px', gap: '6px' },
        thumbnailsContainer: { padding: '10px 16px 14px' },
      }}
      toolbar={{
        buttons: [
          'zoom',
          <SlideActions key="actions" />,
          <ChromeButton key="close" label="Close" onClick={onClose}>
            <X className="size-4" />
          </ChromeButton>,
        ],
      }}
      render={{
        buttonZoom: (zoomRef) => <ZoomControls {...zoomRef} />,
        // Our own arrows, so they match the toolbar instead of the library's.
        buttonPrev: multiple ? () => <NavButton direction="prev" count={count} /> : () => null,
        buttonNext: multiple ? () => <NavButton direction="next" count={count} /> : () => null,
        controls: () => <TitleBar count={count} />,
        slide: ({ slide }) =>
          slide.type === 'pdf' ? (
            <div className="flex h-full max-h-[84vh] w-[min(92vw,1000px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl">
              <div className="flex items-center gap-2 border-b border-black/10 bg-zinc-50 px-3 py-2">
                <FileText className="size-4 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">
                  {slide.title}
                </span>
              </div>
              <iframe
                src={slide.src}
                title={slide.title}
                className="h-full w-full flex-1 border-0 bg-white"
              />
            </div>
          ) : slide.type === 'file' ? (
            <div className="flex w-[min(90vw,420px)] flex-col items-center gap-3 rounded-xl border border-white/10 bg-white px-6 py-8 text-center shadow-2xl">
              <span className="grid size-14 place-items-center rounded-xl bg-zinc-100 text-zinc-500">
                <FileText className="size-7" />
              </span>
              <span className="max-w-full truncate text-sm font-medium text-zinc-800">
                {slide.title}
              </span>
              <span className="text-xs text-zinc-500">
                This file type can&apos;t be previewed here — open or download it
                from the toolbar above.
              </span>
            </div>
          ) : undefined,
        // The thumbnail strip only knows images; document slides get an icon.
        thumbnail: ({ slide }) =>
          slide.type === 'pdf' || slide.type === 'file' ? (
            <span className="grid size-full place-items-center rounded-md bg-white/10 text-white/70">
              <FileText className="size-6" />
            </span>
          ) : undefined,
      }}
    />
  )
}

/**
 * Wire a lightbox into a component in two lines:
 *
 * ```tsx
 * const preview = useFilePreview(files)
 * <button onClick={() => preview.open(i)} /> …
 * {preview.lightbox}
 * ```
 *
 * `files` is the full list the thumbnails render from, so the lightbox can page
 * between them; `open(index)` decides where it starts.
 */
export function useFilePreview(items: PreviewFile[]) {
  const [index, setIndex] = useState<number | null>(null)

  const close = useCallback(() => setIndex(null), [])
  const open = useCallback((at: number) => setIndex(at), [])

  return {
    open,
    close,
    lightbox: (
      <FilePreviewLightbox items={items} index={index} onClose={close} />
    ),
  }
}

/**
 * A thumbnail that opens the lightbox when clicked — the read-only counterpart
 * to {@link useFilePreview}, for detail views that just render one gallery.
 *
 * `files` is the whole gallery so the viewer can page through it; `index` is
 * the one this trigger shows.
 */
export function PreviewTrigger({
  files,
  index = 0,
  className,
  label,
  children,
}: {
  files: PreviewFile[]
  index?: number
  className?: string
  label?: string
  children: React.ReactNode
}) {
  const preview = useFilePreview(files)

  return (
    <>
      <button
        type="button"
        onClick={() => preview.open(index)}
        aria-label={label ?? `Preview ${files[index]?.name ?? 'file'}`}
        className={cn('cursor-zoom-in', className)}
      >
        {children}
      </button>
      {preview.lightbox}
    </>
  )
}
