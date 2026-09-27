export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNumber: string;
  bookingId?: string | null;
  type: 'CheckoutCleaning' | 'StayoverService' | 'Inspection' | 'MaintenanceRecovery' | 'RoomMoveCleaning';
  status: 'Pending' | 'Assigned' | 'InProgress' | 'Completed' | 'Cancelled';
  assignedToUserId?: string | null;
  createdAtUtc: string;
}

export const CLEANING_REMINDER_MS = 2 * 60 * 60 * 1000;
export const activeTask = (task: HousekeepingTask) =>
  task.status !== 'Completed' && task.status !== 'Cancelled';

export function overdueCleaning(tasks: HousekeepingTask[], now: number) {
  return tasks.filter(task => {
    const created = Date.parse(task.createdAtUtc);
    return activeTask(task) && task.type === 'CheckoutCleaning' &&
      Number.isFinite(created) && now - created >= CLEANING_REMINDER_MS;
  });
}
