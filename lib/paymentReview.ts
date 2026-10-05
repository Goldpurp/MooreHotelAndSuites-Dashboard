import type { Booking } from '../types';

export type PaymentReviewItem = {
  bookingCode: string; guestName: string; bookingStatus: string; amount: number;
  currency: string; reportedAtUtc: string; overdue: boolean; roomHeld: boolean;
};

export type PaymentReviewEvidence = {
  bankReference: string;
  amount: number;
  reason: string;
};

export type PaymentReviewRebooking = {
  requestId: number;
  booking: Booking;
  review: PaymentReviewItem;
  evidence: PaymentReviewEvidence;
  roomOptions: PaymentReviewRoomOptions;
};

export type PaymentReviewRoomOption = {
  roomId: string;
  roomNumber: string;
  roomName: string;
};

export type PaymentReviewRoomOptions = {
  bookingCode: string;
  requiredRooms: number;
  roomTypeId: string;
  roomTypeName: string;
  rooms: PaymentReviewRoomOption[];
};

export function canReviewPayments(role: unknown) {
  return typeof role === 'string' && ['admin', 'manager'].includes(role.toLowerCase());
}

export function parsePaymentReviews(value: unknown): PaymentReviewItem[] {
  if (!Array.isArray(value)) throw new Error('Invalid payment review response');
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.bookingCode !== 'string' ||
      typeof item.guestName !== 'string' || typeof item.bookingStatus !== 'string' ||
      typeof item.currency !== 'string' || typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount < 0 ||
      typeof item.reportedAtUtc !== 'string' || !Number.isFinite(Date.parse(item.reportedAtUtc)) ||
      typeof item.overdue !== 'boolean' || typeof item.roomHeld !== 'boolean') {
      throw new Error('Invalid payment review item');
    }
    return item as PaymentReviewItem;
  });
}

export function parsePaymentReviewRoomOptions(value: unknown): PaymentReviewRoomOptions {
  if (!value || typeof value !== 'object') throw new Error('Invalid replacement room response');
  const item = value as Record<string, unknown>;
  if (typeof item.bookingCode !== 'string' || !item.bookingCode.trim() ||
      typeof item.requiredRooms !== 'number' || !Number.isInteger(item.requiredRooms) ||
      item.requiredRooms < 1 || item.requiredRooms > 10 ||
      typeof item.roomTypeId !== 'string' || !item.roomTypeId.trim() ||
      typeof item.roomTypeName !== 'string' || !item.roomTypeName.trim() ||
      !Array.isArray(item.rooms)) {
    throw new Error('Invalid replacement room response');
  }
  const rooms = item.rooms.map(room => {
    if (!room || typeof room !== 'object') throw new Error('Invalid replacement room response');
    const option = room as Record<string, unknown>;
    if (typeof option.roomId !== 'string' || !option.roomId.trim() ||
        typeof option.roomNumber !== 'string' || !option.roomNumber.trim() ||
        typeof option.roomName !== 'string' || !option.roomName.trim()) {
      throw new Error('Invalid replacement room response');
    }
    return option as PaymentReviewRoomOption;
  });
  if (new Set(rooms.map(room => room.roomId)).size !== rooms.length) {
    throw new Error('Invalid replacement room response');
  }
  return { ...item, rooms } as PaymentReviewRoomOptions;
}

export function bankTransactionReference(booking: Pick<Booking, 'transactionReference' | 'bookingCode'> | null | undefined): string {
  const reference = booking?.transactionReference?.trim() || '';
  if (!reference || reference.toUpperCase().startsWith('MANUAL-') || reference.toUpperCase() === booking?.bookingCode?.trim().toUpperCase()) return '';
  return reference;
}
