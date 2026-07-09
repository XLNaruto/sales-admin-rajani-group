import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MapPinned, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { toOptions, RETAILERS } from '../lib/beat-reference'
import type { BeatFormValues } from '../lib/beat-form'

const RETAILER_OPTIONS = toOptions(RETAILERS)

interface OutletsEditorProps {
  control: Control<BeatFormValues>
  register: UseFormRegister<BeatFormValues>
  errors: FieldErrors<BeatFormValues>
}

interface OutletRowProps extends OutletsEditorProps {
  id: string
  index: number
  canRemove: boolean
  onRemove: () => void
  onAdd: () => void
}

/** A single draggable outlet row. Drag from the grip handle to reorder. */
function OutletRow({
  id,
  index,
  canRemove,
  onRemove,
  onAdd,
  control,
  register,
  errors,
}: OutletRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid grid-cols-1 items-start gap-3 rounded-lg border border-border p-3 md:grid-cols-[auto_auto_1fr_1fr_1fr_1fr_auto]',
        isDragging && 'relative z-10 bg-card shadow-lg ring-1 ring-ring',
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
        className="grid size-8 cursor-grab touch-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing md:mt-0.5"
      >
        <GripVertical className="size-4" />
      </button>

      {/* Sequence */}
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary tabular-nums md:mt-1">
        {index + 1}
      </span>

      {/* Retailer */}
      <div className="space-y-1">
        <Controller
          control={control}
          name={`outlets.${index}.retailerId`}
          render={({ field: f }) => (
            <Combobox
              value={f.value ?? ''}
              onChange={f.onChange}
              options={RETAILER_OPTIONS}
              placeholder="Select retailer"
              searchPlaceholder="Search retailer"
            />
          )}
        />
        {errors.outlets?.[index]?.retailerId?.message ? (
          <p className="text-xs text-destructive">{errors.outlets[index]?.retailerId?.message}</p>
        ) : null}
      </div>

      {/* Geo lat */}
      <div className="space-y-1">
        <Input inputMode="decimal" placeholder="Latitude" {...register(`outlets.${index}.geoLat`)} />
        {errors.outlets?.[index]?.geoLat?.message ? (
          <p className="text-xs text-destructive">{errors.outlets[index]?.geoLat?.message}</p>
        ) : null}
      </div>

      {/* Geo lng */}
      <div className="space-y-1">
        <Input
          inputMode="decimal"
          placeholder="Longitude"
          {...register(`outlets.${index}.geoLng`)}
        />
        {errors.outlets?.[index]?.geoLng?.message ? (
          <p className="text-xs text-destructive">{errors.outlets[index]?.geoLng?.message}</p>
        ) : null}
      </div>

      {/* Geo fence */}
      <div className="space-y-1">
        <Input
          inputMode="numeric"
          placeholder="Geo-fence (m)"
          {...register(`outlets.${index}.geoFenceM`)}
        />
        {errors.outlets?.[index]?.geoFenceM?.message ? (
          <p className="text-xs text-destructive">{errors.outlets[index]?.geoFenceM?.message}</p>
        ) : null}
      </div>

      {/* Remove / add */}
      <div className="flex items-center gap-2 md:mt-0.5">
        <button
          type="button"
          title="Remove outlet"
          disabled={!canRemove}
          onClick={onRemove}
          className="grid size-8 cursor-pointer place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-40 dark:text-rose-400"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          title="Add outlet below"
          onClick={onAdd}
          className="grid size-8 cursor-pointer place-items-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Ordered outlet/route editor. The row order IS the visit sequence — drag a
 * row by its grip handle to reorder. Each row picks a retailer and optional geo.
 */
export function OutletsEditor({ control, register, errors }: OutletsEditorProps) {
  const { fields, append, insert, remove, move } = useFieldArray({ control, name: 'outlets' })

  const blankOutlet = { retailerId: '', sequence: 0, geoLat: '', geoLng: '', geoFenceM: '100' }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = fields.findIndex((f) => f.id === active.id)
    const to = fields.findIndex((f) => f.id === over.id)
    if (from !== -1 && to !== -1) move(from, to)
  }

  const rootError =
    typeof errors.outlets?.message === 'string' ? errors.outlets.message : undefined

  return (
    <div className="md:col-span-3 xl:col-span-4">
      <div className="mb-4 flex items-center justify-between border-b-2 border-primary/30 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <MapPinned className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Outlets &amp; Route</h3>
            <p className="text-xs text-muted-foreground">Ordered stops covered on this beat.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => append(blankOutlet)}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Plus className="size-4" /> Add outlet
        </button>
      </div>

      {rootError ? <p className="mb-3 text-xs text-destructive">{rootError}</p> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <OutletRow
                key={field.id}
                id={field.id}
                index={index}
                canRemove={fields.length > 1}
                onRemove={() => remove(index)}
                onAdd={() => insert(index + 1, blankOutlet)}
                control={control}
                register={register}
                errors={errors}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
