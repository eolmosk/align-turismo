'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface SchoolBrand {
  logo_url: string | null
  color_primary: string | null
  color_secondary: string | null
  color_accent: string | null
}

let cachedBrand: SchoolBrand | null = null
let cachedSchoolId: string | null = null

export function useSchoolBrand() {
  const { data: session, status } = useSession()
  const schoolId = session?.user?.school_id
  const [brand, setBrand] = useState<SchoolBrand | null>(cachedBrand)

  useEffect(() => {
    if (status === 'loading' || !schoolId) return
    if (cachedSchoolId === schoolId && cachedBrand) {
      setBrand(cachedBrand)
      return
    }
    fetch('/api/schools/brand')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          cachedBrand = data
          cachedSchoolId = schoolId
          setBrand(data)
        }
      })
  }, [schoolId, status])

  return brand
}

// Invalida el cache (llamar al cambiar de escuela)
export function invalidateBrandCache() {
  cachedBrand = null
  cachedSchoolId = null
}
