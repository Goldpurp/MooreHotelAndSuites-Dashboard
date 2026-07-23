const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const getCheckoutDeadline = (value?: string) => {
  const deadline = new Date(value || "");
  if (Number.isNaN(deadline.getTime())) return null;
  deadline.setHours(12, 0, 0, 0);
  return deadline;
};

export const isCheckoutOverdue = (
  value?: string,
  now: number | Date = Date.now(),
) => {
  const deadline = getCheckoutDeadline(value);
  if (!deadline) return false;
  const currentTime = now instanceof Date ? now.getTime() : now;
  return currentTime > deadline.getTime();
};

const formatElapsed = (elapsedMs: number) => {
  if (elapsedMs < MINUTE_MS) return "<1 MIN";

  const days = Math.floor(elapsedMs / DAY_MS);
  const hours = Math.floor((elapsedMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((elapsedMs % HOUR_MS) / MINUTE_MS);

  if (days > 0) return `${days}D${hours > 0 ? ` ${hours}H` : ""}`;
  if (hours > 0) return `${hours}H${minutes > 0 ? ` ${minutes}M` : ""}`;
  return `${minutes} MIN${minutes === 1 ? "" : "S"}`;
};

export interface CheckoutTiming {
  label: string;
  isOverdue: boolean;
}

export const getCheckoutTiming = (
  value?: string,
  now: number | Date = Date.now(),
  warningWindowMinutes = 30,
): CheckoutTiming | null => {
  const deadline = getCheckoutDeadline(value);
  if (!deadline) return null;

  const currentTime = now instanceof Date ? now.getTime() : now;
  const difference = deadline.getTime() - currentTime;

  if (difference > warningWindowMinutes * MINUTE_MS) return null;

  if (difference > 0) {
    const remainingMinutes = Math.max(1, Math.ceil(difference / MINUTE_MS));
    return {
      label: `${remainingMinutes} MIN${remainingMinutes === 1 ? "" : "S"} LEFT`,
      isOverdue: false,
    };
  }

  return {
    label: `${formatElapsed(Math.abs(difference))} OVERDUE`,
    isOverdue: true,
  };
};
