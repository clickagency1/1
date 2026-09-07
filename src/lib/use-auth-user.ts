import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { isSupportStaffRole, type AppRole } from './admin'

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      const currentUser = data.session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle()
        if (active) setRole((profile?.role as AppRole | undefined) ?? 'client')
      } else {
        setRole(null)
      }
      setLoading(false)
    }

    void loadUser()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      void loadUser()
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { user, role, isAdmin: role === 'admin', isSupportStaff: isSupportStaffRole(role), loading }
}
