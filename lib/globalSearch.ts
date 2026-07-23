import {
  AppNotification,
  AuditLog,
  Booking,
  Guest,
  Room,
  StaffUser,
  UserRole,
  VisitRecord,
} from "../types";
import {
  formatPrivateDateTime,
  getBookingReferenceDisplay,
  getFriendlyAreaName,
  getPrivateGuestName,
  getStaffDisplayName,
} from "./displayPrivacy";

export type GlobalSearchKind =
  | "page"
  | "room"
  | "booking"
  | "guest"
  | "payment"
  | "staff"
  | "client"
  | "activity"
  | "notification"
  | "audit";

export interface GlobalSearchResult {
  key: string;
  kind: GlobalSearchKind;
  tab: string;
  targetId?: string;
  title: string;
  description: string;
  meta?: string;
  score: number;
}

export interface GlobalSearchGroup {
  kind: GlobalSearchKind;
  label: string;
  results: GlobalSearchResult[];
}

interface GlobalSearchData {
  query: string;
  rooms: Room[];
  bookings: Booking[];
  guests: Guest[];
  staff: StaffUser[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  visitHistory: VisitRecord[];
  userRole: UserRole;
}

interface SearchCandidate extends Omit<GlobalSearchResult, "score"> {
  primary: unknown[];
  searchable: unknown[];
}

const GROUP_LABELS: Record<GlobalSearchKind, string> = {
  page: "Quick links",
  room: "Rooms",
  booking: "Bookings",
  guest: "Guests",
  payment: "Payments",
  staff: "Staff",
  client: "Clients",
  activity: "Activity",
  notification: "Notifications",
  audit: "Change history",
};

const GROUP_ORDER: GlobalSearchKind[] = [
  "page",
  "room",
  "booking",
  "guest",
  "payment",
  "staff",
  "client",
  "activity",
  "notification",
  "audit",
];

const SENSITIVE_KEY = /password|passcode|token|secret|credential|authorization|cookie|private.?key/i;

const toDisplayLabel = (value: unknown) => {
  const normalized = String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const normalizeGlobalSearch = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const dateSearchValues = (value?: string) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return [value || ""];
  return [
    value || "",
    date.toLocaleDateString("en-GB"),
    date.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
    date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
  ];
};

const flattenSafeValues = (value: unknown, depth = 0): string[] => {
  if (depth > 3 || value == null) return [];
  if (["string", "number", "boolean"].includes(typeof value)) return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => flattenSafeValues(item, depth + 1));
  if (typeof value !== "object") return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    if (SENSITIVE_KEY.test(key)) return [];
    return [key, ...flattenSafeValues(entry, depth + 1)];
  });
};

const roomStatusLabel = (room: Room) =>
  `${toDisplayLabel(room.status)}${room.isOnline === false ? " · Offline" : ""}`;

const bookingRoomLabel = (booking: Booking, rooms: Room[]) => {
  const room = rooms.find((item) => item.id === booking.roomId);
  return room ? `Room ${room.roomNumber}` : "Room not assigned";
};

const candidateScore = (candidate: SearchCandidate, normalizedQuery: string) => {
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const primary = normalizeGlobalSearch(candidate.primary.join(" "));
  const searchable = normalizeGlobalSearch([...candidate.primary, ...candidate.searchable].join(" "));
  if (!tokens.every((token) => searchable.includes(token))) return -1;

  if (primary === normalizedQuery) return 120;
  if (primary.startsWith(normalizedQuery)) return 95;
  if (primary.includes(normalizedQuery)) return 80;

  const exactTokenMatches = tokens.filter((token) => primary.split(" ").includes(token)).length;
  const prefixMatches = tokens.filter((token) => primary.split(" ").some((word) => word.startsWith(token))).length;
  return 40 + exactTokenMatches * 10 + prefixMatches * 5;
};

export function buildGlobalSearchGroups({
  query,
  rooms,
  bookings,
  guests,
  staff,
  notifications,
  auditLogs,
  visitHistory,
  userRole,
}: GlobalSearchData): GlobalSearchGroup[] {
  const normalizedQuery = normalizeGlobalSearch(query);
  if (normalizedQuery.length < 2) return [];

  const privileged = userRole === UserRole.Admin || userRole === UserRole.Manager;
  const candidates: SearchCandidate[] = [];
  const add = (candidate: SearchCandidate) => candidates.push(candidate);

  const pages = [
    { id: "dashboard", title: "Home dashboard", keywords: "overview revenue occupancy arrivals activity" },
    { id: "bookings", title: "Bookings", keywords: "reservation stay check in check out walk in" },
    { id: "rooms", title: "Rooms", keywords: "room inventory availability occupied cleaning maintenance" },
    { id: "guests", title: "Guests", keywords: "resident visitor stay history" },
    { id: "settings", title: "Settings", keywords: "profile password account preferences" },
    ...(privileged
      ? [
          { id: "settlements", title: "Payments", keywords: "settlement transfer refund transaction finance" },
          { id: "reports", title: "Analytics", keywords: "reports statistics revenue occupancy change history" },
          { id: "operation_log", title: "Activity log", keywords: "audit actions check in check out reservations" },
          { id: "staff", title: "Staff", keywords: "employees team roles access" },
          { id: "clients", title: "Clients", keywords: "guest accounts app users" },
        ]
      : []),
  ];

  pages.forEach((page) => add({
    key: `page-${page.id}`,
    kind: "page",
    tab: page.id,
    title: page.title,
    description: "Open this section",
    primary: [page.title],
    searchable: [page.id, page.keywords],
  }));

  rooms.forEach((room) => add({
    key: `room-${room.id}`,
    kind: "room",
    tab: "rooms",
    targetId: room.id,
    title: `Room ${room.roomNumber} — ${room.name}`,
    description: `${room.category} · ${room.floor.replace(/(?!^)([A-Z])/g, " $1")}`,
    meta: roomStatusLabel(room),
    primary: [room.roomNumber, room.name, room.category],
    searchable: [
      room.id, room.floor, room.status, room.pricePerNight, room.capacity, room.size,
      room.description, room.amenities, room.isOnline, ...dateSearchValues(room.createdAt),
    ],
  }));

  bookings.forEach((booking) => {
    const guestName = `${booking.guestFirstName || ""} ${booking.guestLastName || ""}`.trim() || "Guest";
    const roomLabel = bookingRoomLabel(booking, rooms);
    add({
      key: `booking-${booking.id}`,
      kind: "booking",
      tab: "bookings",
      targetId: booking.id,
      title: guestName,
      description: `${getBookingReferenceDisplay(booking.bookingCode)} · ${roomLabel}`,
      meta: toDisplayLabel(booking.status),
      primary: [guestName, booking.bookingCode, roomLabel],
      searchable: [
        booking.id, booking.guestId, booking.roomId, booking.guestEmail, booking.guestPhone,
        booking.status, booking.notes, booking.notificationMessage,
        ...dateSearchValues(booking.checkIn), ...dateSearchValues(booking.checkOut),
        ...dateSearchValues(booking.createdAt),
        ...(booking.statusHistory || []).flatMap((item) => [item.status, ...dateSearchValues(item.timestamp)]),
      ],
    });

    if (privileged) {
      add({
        key: `payment-${booking.id}`,
        kind: "payment",
        tab: "settlements",
        targetId: booking.id,
        title: guestName,
        description: `${getBookingReferenceDisplay(booking.bookingCode)} · ₦${Number(booking.amount || 0).toLocaleString()}`,
        meta: toDisplayLabel(booking.paymentStatus || "Unpaid"),
        primary: [booking.transactionReference, booking.bookingCode, booking.amount, booking.paymentStatus],
        searchable: [
          booking.id, guestName, booking.guestEmail, booking.guestPhone, booking.paymentMethod,
          booking.transactionReference, booking.amount, Number(booking.amount || 0).toLocaleString(),
          booking.paymentStatus, "naira", "payment", "settlement", ...dateSearchValues(booking.createdAt),
        ],
      });
    }
  });

  guests.forEach((guest) => {
    const guestName = `${guest.firstName || ""} ${guest.lastName || ""}`.trim() || "Guest";
    add({
      key: `guest-${guest.id}`,
      kind: "guest",
      tab: "guests",
      targetId: guest.id,
      title: guestName,
      description: guest.email || guest.phone || "Guest profile",
      meta: `${guest.totalStays || 0} stay${guest.totalStays === 1 ? "" : "s"}`,
      primary: [guestName, guest.email, guest.phone],
      searchable: [guest.id, guest.totalStays, guest.totalSpent, guest.isVIP, "vip", "guest", "resident"],
    });
  });

  if (privileged) {
    staff.forEach((profile) => {
      const isClient = profile.role === UserRole.Client;
      add({
        key: `${isClient ? "client" : "staff"}-${profile.id}`,
        kind: isClient ? "client" : "staff",
        tab: isClient ? "clients" : "staff",
        targetId: profile.id,
        title: profile.name || (isClient ? "Client" : "Staff member"),
        description: profile.email || profile.phone || (isClient ? "Client profile" : "Staff profile"),
        meta: `${toDisplayLabel(profile.role)} · ${toDisplayLabel(profile.status)}`,
        primary: [profile.name, profile.email, profile.phone, profile.department],
        searchable: [profile.id, profile.role, profile.status, profile.department, ...dateSearchValues(profile.createdAt)],
      });
    });

    visitHistory.forEach((record) => add({
      key: `activity-${record.id}`,
      kind: "activity",
      tab: "operation_log",
      targetId: record.id,
      title: `${record.action} · ${getPrivateGuestName(record.guestName)}`,
      description: `${record.roomNumber && record.roomNumber !== "---" ? `Room ${record.roomNumber}` : "Room not assigned"} · ${formatPrivateDateTime(record.timestamp)}`,
      meta: getStaffDisplayName(record.authorizedBy),
      primary: [record.action, record.guestName, record.bookingCode, record.roomNumber],
      searchable: [
        record.id, record.guestId, record.roomId, record.authorizedBy,
        ...dateSearchValues(record.timestamp), "activity", "audit",
      ],
    }));

    auditLogs.forEach((log) => add({
      key: `audit-${log.id}`,
      kind: "audit",
      tab: "reports",
      targetId: log.id,
      title: `${toDisplayLabel(log.action || "Updated")} · ${getFriendlyAreaName(log.entityType)}`,
      description: formatPrivateDateTime(log.createdAt),
      meta: log.profileId ? "Authorized staff" : "Automated system",
      primary: [log.action, log.entityType],
      searchable: [
        log.id, log.profileId, log.entityId, ...dateSearchValues(log.createdAt),
        ...flattenSafeValues(log.oldData), ...flattenSafeValues(log.newData),
      ],
    }));
  }

  notifications.forEach((notification) => {
    const linkedBooking = bookings.find((booking) => booking.bookingCode === notification.bookingCode);
    const notificationText = `${notification.title} ${notification.message}`.toLowerCase();
    const isPaymentNotification = /payment|settlement|refund|transfer/.test(notificationText);
    const tab = linkedBooking ? "bookings" : privileged && isPaymentNotification ? "settlements" : "dashboard";
    const safeDescription = linkedBooking
      ? `${getPrivateGuestName(`${linkedBooking.guestFirstName || ""} ${linkedBooking.guestLastName || ""}`)} · ${getBookingReferenceDisplay(linkedBooking.bookingCode)} · ${toDisplayLabel(linkedBooking.status)}`
      : "Hotel notification";
    add({
      key: `notification-${notification.id}`,
      kind: "notification",
      tab,
      targetId: linkedBooking?.id || notification.id,
      title: notification.title || "Notification",
      description: safeDescription,
      meta: `${notification.isRead ? "Read" : "Unread"} · ${formatPrivateDateTime(notification.createdAt)}`,
      primary: [notification.title, notification.bookingCode],
      searchable: [notification.id, notification.message, notification.isRead, ...dateSearchValues(notification.createdAt)],
    });
  });

  const scored = candidates
    .map((candidate) => ({
      ...candidate,
      score: candidateScore(candidate, normalizedQuery),
    }))
    .filter((candidate) => candidate.score >= 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return GROUP_ORDER.map((kind) => ({
    kind,
    label: GROUP_LABELS[kind],
    results: scored.filter((result) => result.kind === kind).slice(0, 6),
  })).filter((group) => group.results.length > 0);
}
