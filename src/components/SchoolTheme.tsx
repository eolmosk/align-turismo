'use client'
import { useSchoolBrand } from './SchoolBranding'

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}

function deriveTone(hex: string, target: number, weight: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c * (1 - weight) + target * weight)
  return `${mix(r)} ${mix(g)} ${mix(b)}`
}

export default function SchoolTheme() {
  const brand = useSchoolBrand()

  if (!brand?.color_primary) return null

  const p = brand.color_primary

  const css = `
    :root {
      --brand-50: ${deriveTone(p, 255, 0.92)};
      --brand-100: ${deriveTone(p, 255, 0.82)};
      --brand-200: ${deriveTone(p, 255, 0.6)};
      --brand-300: ${deriveTone(p, 255, 0.4)};
      --brand-400: ${deriveTone(p, 255, 0.15)};
      --brand-500: ${hexToRgb(p)};
      --brand-600: ${deriveTone(p, 0, 0.15)};
      --brand-700: ${deriveTone(p, 0, 0.3)};
    }
  `

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
