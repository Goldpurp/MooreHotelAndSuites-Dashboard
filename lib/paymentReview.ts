export type PaymentReviewItem = {
  bookingCode: string; guestName: string; bookingStatus: string; amount: number;
  currency: string; reportedAtUtc: string; overdue: boolean; roomHeld: boolean;
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
