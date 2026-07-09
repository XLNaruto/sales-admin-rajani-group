import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Low-level table primitives shared by the generic <DataTable>. Feature screens
 * should reach for DataTable; use these only for bespoke one-off tables.
 */
function Table({
  className,
  containerClassName,
  maxHeight,
  ...props
}: React.ComponentProps<'table'> & {
  /** Extra classes for the scroll container. */
  containerClassName?: string
  /** When set, the container scrolls vertically and the header stays sticky. */
  maxHeight?: string
}) {
  return (
    <div
      className={cn('relative w-full overflow-auto', containerClassName)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table
        className={cn('w-full caption-bottom border-separate border-spacing-0 text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('sticky top-0 z-20', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={className} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-accent/40 data-[state=selected]:bg-accent',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-11 border-b border-border bg-[#EEF1F7] px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-[#334155] dark:bg-muted/50 dark:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'border-b border-border/60 px-4 py-3 align-middle text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
