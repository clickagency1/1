export type AppRole = 'admin' | 'client' | 'support'

export function isAdminRole(role: AppRole | null | undefined) {
  return role === 'admin'
}

/** موظف الدعم أو الأدمن (الأدمن يقدر يشوف /support كمان). */
export function isSupportStaffRole(role: AppRole | null | undefined) {
  return role === 'support' || role === 'admin'
}
