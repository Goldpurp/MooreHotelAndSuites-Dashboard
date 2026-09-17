import { AppUser, UserRole } from "../types";

const department = (user: AppUser | null) =>
  (user?.department || "").toLowerCase().replace(/[\s_-]/g, "");

export const isPrivileged = (user: AppUser | null) =>
  user?.role === UserRole.Admin || user?.role === UserRole.Manager;

export const isAdmin = (user: AppUser | null) => user?.role === UserRole.Admin;

export const canReadReservations = (user: AppUser | null) =>
  isPrivileged(user) ||
  (user?.role === UserRole.Staff && ["reception", "frontdesk", "concierge"].includes(department(user)));

export const canManageReservations = (user: AppUser | null) =>
  isPrivileged(user) ||
  (user?.role === UserRole.Staff && ["reception", "frontdesk"].includes(department(user)));

export const canReadGuestPii = (user: AppUser | null) => canManageReservations(user);

export const canReadFolios = (user: AppUser | null) =>
  isPrivileged(user) ||
  (user?.role === UserRole.Staff && ["reception", "frontdesk", "finance", "cashier"].includes(department(user)));

export const canReadOperations = (user: AppUser | null) => canManageReservations(user);

export const canOpenTab = (user: AppUser | null, tab: string) => {
  switch (tab) {
    case "dashboard":
    case "reports":
    case "staff":
    case "clients":
      return isPrivileged(user);
    case "operation_log":
    case "privacy":
      return isAdmin(user);
    case "bookings":
    case "rooms":
      return canReadReservations(user);
    case "guests":
      return canReadGuestPii(user);
    case "settlements":
      return canReadFolios(user);
    case "settings":
      return Boolean(user);
    default:
      return false;
  }
};

export const firstAllowedTab = (user: AppUser | null) =>
  ["dashboard", "bookings", "rooms", "guests", "settlements", "settings"].find((tab) => canOpenTab(user, tab)) || "settings";
