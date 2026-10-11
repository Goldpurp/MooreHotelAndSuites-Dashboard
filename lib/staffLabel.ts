type StaffIdentity = { role?: string | null; department?: string | null };

/** Display the job title without changing the account's authorization role. */
export function staffLabel(user: StaffIdentity | null | undefined): string {
  const role = user?.role?.toLowerCase();
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Manager';
  if (role === 'client') return 'Client';
  const name = user?.department?.trim() ?? '';
  const department = name.toLowerCase().replace(/[\s_-]/g, '');
  const titles: Record<string, string> = {
    housekeeping: 'Housekeeper', reception: 'Receptionist', frontdesk: 'Receptionist',
    finance: 'Finance', cashier: 'Cashier', engineering: 'Engineer',
    maintenance: 'Maintenance', concierge: 'Concierge',
  };
  return titles[department] ?? (name || 'Staff');
}
