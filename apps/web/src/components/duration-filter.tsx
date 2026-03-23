'use client'

import { cn } from '@/lib/cn'

interface DurationFilterProps {
  selected: string
  onChange: (duration: string) => void
}

const OPTIONS = [
  { value: '', label: 'All' },
  { value: 'short', label: '< 5 min' },
  { value: 'medium', label: '5–15 min' },
  { value: 'long', label: '15+ min' },
]

export function DurationFilter({ selected, onChange }: DurationFilterProps) {
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'flex-shrink-0 rounded-full px-4 py-2 font-body text-sm font-medium transition-all duration-300',
            selected === value
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
