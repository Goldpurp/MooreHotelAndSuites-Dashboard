import type { StaffUser } from '../types';

// This endpoint returns login accounts, not the guest directory or bookings.
export function parseClientAccounts(response: unknown): StaffUser[] {
  if (!Array.isArray(response)) throw new Error('Client accounts could not be read. Please refresh.');
  const ids = new Set<string>();
  return response.map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('An invalid client account was returned. Please refresh.');
    const id = raw.id ?? raw.Id;
    const role = String(raw.role ?? raw.Role ?? '').toLowerCase();
    const status = String(raw.status ?? raw.Status ?? '').toLowerCase();
    const name = raw.name ?? raw.Name;
    const email = raw.email ?? raw.Email;
    if (typeof id !== 'string' || !id || ids.has(id) || role !== 'client' ||
        !['active', 'suspended'].includes(status) || typeof name !== 'string' || typeof email !== 'string') {
      throw new Error('An invalid client account was returned. Please refresh.');
    }
    ids.add(id);
    return {
      id, name, email, role: 'Client', status: status === 'active' ? 'Active' : 'Suspended',
      phone: raw.phone ?? raw.Phone ?? '', department: raw.department ?? raw.Department ?? '',
      avatarUrl: raw.avatarUrl ?? raw.AvatarUrl ?? '/avatar-placeholder.svg',
      createdAt: raw.onboardingDate ?? raw.OnboardingDate ?? raw.createdAt ?? raw.CreatedAt ?? '',
    } as StaffUser;
  });
}
