import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth')
  }

  const status = session.user.status
  if (status === 'pending' || status === 'rejected') {
    redirect('/pending')
  }

  return (
    <div className="max-w-5xl mx-auto bg-white min-h-screen shadow-sm">
      {children}
    </div>
  )
}
