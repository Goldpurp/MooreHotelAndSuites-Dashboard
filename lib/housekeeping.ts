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
const taskTypes: HousekeepingTask['type'][] = ['CheckoutCleaning', 'StayoverService', 'Inspection', 'MaintenanceRecovery', 'RoomMoveCleaning'];
const taskStatuses: HousekeepingTask['status'][] = ['Pending', 'Assigned', 'InProgress', 'Completed', 'Cancelled'];

/** Normalize the API's camelCase enum strings; reject unknown states fail-closed. */
export function parseHousekeepingTasks(payload: unknown): HousekeepingTask[] {
  if (!Array.isArray(payload)) throw new Error('Invalid housekeeping response');
  return payload.map(value => {
    if (!value || typeof value !== 'object') throw new Error('Invalid housekeeping task');
    const type = taskTypes.find(item => item.toLowerCase() === String(value.type).toLowerCase());
    const status = taskStatuses.find(item => item.toLowerCase() === String(value.status).toLowerCase());
    if (!type || !status || typeof value.id !== 'string' || !value.id ||
        typeof value.roomId !== 'string' || !value.roomId || typeof value.roomNumber !== 'string' ||
        typeof value.createdAtUtc !== 'string' || !Number.isFinite(Date.parse(value.createdAtUtc)) ||
        (value.assignedToUserId != null && typeof value.assignedToUserId !== 'string')) {
      throw new Error('Invalid housekeeping task');
    }
    return { ...value, type, status };
  });
}

export const activeTask = (task: HousekeepingTask) =>
  task.status !== 'Completed' && task.status !== 'Cancelled';

export function overdueCleaning(tasks: HousekeepingTask[], now: number) {
  return tasks.filter(task => {
    const created = Date.parse(task.createdAtUtc);
    return activeTask(task) && task.type === 'CheckoutCleaning' &&
      Number.isFinite(created) && now - created >= CLEANING_REMINDER_MS;
  });
}
