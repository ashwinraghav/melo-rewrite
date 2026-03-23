/**
 * Material Symbols Rounded icon.
 * Uses the icon font loaded in layout.tsx.
 */
export function Icon({
  name,
  className = '',
  filled = false,
  size = 24,
}: {
  name: string
  className?: string
  filled?: boolean
  size?: number
}) {
  return (
    <span
      className={`material-symbols-rounded select-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden
    >
      {name}
    </span>
  )
}
