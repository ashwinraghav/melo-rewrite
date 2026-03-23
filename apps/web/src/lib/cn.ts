import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes safely.
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 *
 * Usage: cn('p-4 bg-surface', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
