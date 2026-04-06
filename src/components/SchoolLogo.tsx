'use client'
import { useSession } from 'next-auth/react'
import { useSchoolBrand } from './SchoolBranding'

export default function SchoolLogo({ size = 28 }: { size?: number }) {
  const { data: session } = useSession()
  const brand = useSchoolBrand()
  const schoolName = session?.user?.school?.name

  if (!schoolName) return null

  if (brand?.logo_url) {
    return (
      <img
        src={brand.logo_url}
        alt={schoolName}
        className="rounded object-contain flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  // Fallback: inicial de la escuela con color primario
  return (
    <div
      className="rounded flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: brand?.color_primary || '#CD4700',
      }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.45 }}>
        {schoolName.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}
