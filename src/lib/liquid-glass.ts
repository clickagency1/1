import type { MouseEvent as ReactMouseEvent } from 'react'

/**
 * Tracks the pointer position over an element and stores it as CSS custom
 * properties (--gx / --gy). The liquid-glass CSS reads these to position the
 * specular highlight, and (via @property in styles.css) transitions smoothly
 * between positions instead of snapping instantly to the cursor.
 */
export function trackGlow(event: ReactMouseEvent<HTMLElement>) {
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  target.style.setProperty('--gx', `${((event.clientX - rect.left) / rect.width) * 100}%`)
  target.style.setProperty('--gy', `${((event.clientY - rect.top) / rect.height) * 100}%`)
}
