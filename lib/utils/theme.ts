const DEFAULT_PRIMARY = '#FF6B6B'
const DEFAULT_SECONDARY = '#4ECDC4'
const DEFAULT_ACCENT = '#FFE66D'

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

type ThemeColors = {
  primary?: string
  secondary?: string
  accent?: string
}

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const normalizeChannel = (hex: string) => parseInt(hex, 16)

const channelToHex = (value: number) => clampChannel(value).toString(16).padStart(2, '0').toUpperCase()

const expandShortHex = (hex: string) => `#${hex.slice(1).split('').map((char) => char + char).join('')}`

const ensureLongHex = (hex: string) => (hex.length === 4 ? expandShortHex(hex) : hex.toUpperCase())

export const DEFAULT_THEME_COLORS = {
  primary: DEFAULT_PRIMARY,
  secondary: DEFAULT_SECONDARY,
  accent: DEFAULT_ACCENT,
}

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback

  let hex = value.trim()
  if (!hex.startsWith('#')) {
    hex = `#${hex}`
  }

  if (!HEX_COLOR_PATTERN.test(hex)) {
    return fallback
  }

  return ensureLongHex(hex)
}

function adjustHexColor(hex: string, amount: number) {
  const normalizedHex = ensureLongHex(hex)
  const r = normalizeChannel(normalizedHex.slice(1, 3))
  const g = normalizeChannel(normalizedHex.slice(3, 5))
  const b = normalizeChannel(normalizedHex.slice(5, 7))

  const adjust = (channel: number) => {
    if (amount >= 0) {
      return channel + (255 - channel) * amount
    }

    return channel * (1 + amount)
  }

  const newR = channelToHex(adjust(r))
  const newG = channelToHex(adjust(g))
  const newB = channelToHex(adjust(b))

  return `#${newR}${newG}${newB}`
}

export function applyThemeColors(colors: ThemeColors) {
  if (typeof window === 'undefined') {
    return
  }

  const root = document.documentElement

  const primary = normalizeHexColor(colors.primary, DEFAULT_PRIMARY)
  const secondary = normalizeHexColor(colors.secondary, DEFAULT_SECONDARY)
  const accent = normalizeHexColor(colors.accent, DEFAULT_ACCENT)

  const primaryDark = adjustHexColor(primary, -0.2)
  const primaryLight = adjustHexColor(primary, 0.15)

  root.style.setProperty('--color-primary', primary)
  root.style.setProperty('--color-primary-dark', primaryDark)
  root.style.setProperty('--color-primary-light', primaryLight)
  root.style.setProperty('--color-secondary', secondary)
  root.style.setProperty('--color-accent', accent)
}

type RestaurantThemeLike = {
  theme_primary_color?: string | null
  theme_secondary_color?: string | null
  theme_accent_color?: string | null
}

export function applyRestaurantTheme(restaurant?: RestaurantThemeLike | null) {
  if (!restaurant) return

  applyThemeColors({
    primary: restaurant.theme_primary_color || undefined,
    secondary: restaurant.theme_secondary_color || undefined,
    accent: restaurant.theme_accent_color || undefined,
  })
}
