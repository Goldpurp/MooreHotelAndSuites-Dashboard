import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { sileo } from "sileo";
import {
  Room,
  Booking,
  Guest,
  RoomStatus,
  BookingStatus,
  AppNotification,
  UserRole,
  AppUser,
  StaffUser,
  AuditLog,
  VisitRecord,
  PaymentStatus,
  VisitAction,
  ProfileStatus,
  PaymentMethod,
  BookingInitResponse,
} from "../types";
import { api } from "../lib/api";

interface HotelContextType {
  rooms: Room[];
  bookings: Booking[];
  guests: Guest[];
  staff: StaffUser[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  visitHistory: VisitRecord[];
  userRole: UserRole;
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isInitialLoading: boolean;
  isSidebarCollapsed: boolean;
  activeTab: string;
  selectedBookingId: string | null;
  setSelectedBookingId: (id: string | null) => void;
  selectedGuestId: string | null;
  setSelectedGuestId: (id: string | null) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  selectedPaymentBookingId: string | null;
  setSelectedPaymentBookingId: (id: string | null) => void;
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  selectedVisitRecordId: string | null;
  setSelectedVisitRecordId: (id: string | null) => void;
  selectedAuditLogId: string | null;
  setSelectedAuditLogId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;
  addRoom: (room: Omit<Room, "id">) => Promise<void>;
  updateRoom: (id: string, updates: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  toggleRoomMaintenance: (id: string) => Promise<void>;
  addBooking: (payload: any) => Promise<BookingInitResponse>;
  confirmTransfer: (bookingCode: string, confirmationText: string) => Promise<void>;
  checkInBooking: (bookingId: string) => Promise<void>;
  checkOutBooking: (bookingId: string) => Promise<void>;
  checkInBookingByCode: (code: string) => Promise<void>;
  verifyMonnify: (bookingCode: string) => Promise<void>;
  /**
   * CHANGE: Updated signature for the new cancellation API.
   * Targets: POST /api/bookings/{id}/cancel?reason={reason}
   */
  cancelBooking: (bookingId: string, reason?: string) => Promise<void>;
  /**
   * CHANGE: New protocol for completing refunds.
   * Targets: POST /api/bookings/{id}/complete-refund?transactionRef={transactionRef}
   */
  completeRefund: (bookingId: string, transactionRef: string) => Promise<void>;
  addGuest: (
    guest: Omit<Guest, "id" | "totalStays" | "totalSpent">,
  ) => Promise<string>;
  isRoomAvailable: (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string,
  ) => boolean;
  dismissNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addStaff: (user: any) => Promise<void>;
  updateStaff: (id: string, updates: Partial<StaffUser>) => Promise<void>;
  toggleStaffStatus: (id: string) => Promise<void>;
  updateCurrentUserProfile: (
    updates: Partial<AppUser>,
    options?: { persist?: boolean },
  ) => Promise<void>;
  refreshData: (options?: { silent?: boolean }) => Promise<void>;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const VALID_TABS = new Set([
  "dashboard",
  "bookings",
  "rooms",
  "guests",
  "reports",
  "operation_log",
  "staff",
  "clients",
  "settings",
  "settlements",
]);

function readInitialTab(): string {
  if (typeof window === "undefined") return "dashboard";
  const requested = new URL(window.location.href).searchParams.get("view") || "dashboard";
  return VALID_TABS.has(requested) ? requested : "dashboard";
}

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error("useHotel must be used within a HotelProvider");
  }
  return context;
};

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.Staff);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTabState] = useState(readInitialTab);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedPaymentBookingId, setSelectedPaymentBookingId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedVisitRecordId, setSelectedVisitRecordId] = useState<string | null>(null);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(null);
  const lastAnnouncedNotificationIdRef = useRef<string | null>(null);

  const setActiveTab = useCallback((tab: string) => {
    const nextTab = VALID_TABS.has(tab) ? tab : "dashboard";
    setActiveTabState(nextTab);

    const url = new URL(window.location.href);
    if (nextTab === "dashboard") url.searchParams.delete("view");
    else url.searchParams.set("view", nextTab);
    window.history.pushState({ view: nextTab }, "", url);
  }, []);

  useEffect(() => {
    const handleHistoryNavigation = () => setActiveTabState(readInitialTab());
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, []);

  useEffect(() => {
    const handleSessionEnded = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason;
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUserRole(UserRole.Staff);
      setRooms([]);
      setBookings([]);
      setGuests([]);
      setStaff([]);
      setNotifications([]);
      setAuditLogs([]);
      setVisitHistory([]);
      setSelectedBookingId(null);
      setSelectedGuestId(null);
      setSelectedRoomId(null);
      setSelectedPaymentBookingId(null);
      setSelectedProfileId(null);
      setSelectedVisitRecordId(null);
      setSelectedAuditLogId(null);
      sileo.error({
        title: reason === "suspended" ? "Account suspended" : "Session expired",
        description:
          reason === "suspended"
            ? "Your access has been suspended. Contact an administrator."
            : "Please sign in again to continue.",
      });
    };

    window.addEventListener("mhs:session-ended", handleSessionEnded);
    return () => window.removeEventListener("mhs:session-ended", handleSessionEnded);
  }, []);

  const normalizeData = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.items && Array.isArray(res.items)) return res.items;
    if (res.value && Array.isArray(res.value)) return res.value;
    return [];
  };

  const toCanonicalStatus = (val: string | undefined): any => {
    if (!val) return val;
    const lower = val.toLowerCase().replace(/[\s_-]/g, "");
    if (lower === "checkedin") return BookingStatus.CheckedIn;
    if (lower === "checkedout") return BookingStatus.CheckedOut;
    if (lower === "occupied") return RoomStatus.Occupied;
    if (lower === "available") return RoomStatus.Available;
    if (lower === "cleaning") return RoomStatus.Cleaning;
    if (lower === "maintenance") return RoomStatus.Maintenance;
    if (lower === "reserved") return BookingStatus.Reserved;
    if (lower === "cancelled") return BookingStatus.Cancelled;
    if (lower === "pending") return BookingStatus.Pending;
    if (lower === "confirmed") return BookingStatus.Confirmed;
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  /**
   * CHANGE: Added specific normalization for Refund-related payment statuses
   * to ensure UI logic recognizes these states correctly.
   */
  const toCanonicalPaymentStatus = (val: string | undefined): PaymentStatus => {
    if (!val) return PaymentStatus.Unpaid;
    const lower = val.toLowerCase().replace(/[\s_-]/g, "");
    if (lower === "paid") return PaymentStatus.Paid;
    if (lower === "unpaid") return PaymentStatus.Unpaid;
    if (lower === "awaitingverification")
      return PaymentStatus.AwaitingVerification;
    if (lower === "refundpending") return PaymentStatus.RefundPending;
    if (lower === "refunded") return PaymentStatus.Refunded;
    return PaymentStatus.Unpaid;
  };

  const toCanonicalPaymentMethod = (val: string | undefined): PaymentMethod => {
    if (!val) return PaymentMethod.DirectTransfer;
    const lower = val.toLowerCase().replace(/[\s_-]/g, "");
    if (lower === "monnify") return PaymentMethod.Monnify;
    if (lower === "directtransfer" || lower === "banktransfer") return PaymentMethod.DirectTransfer;
    return PaymentMethod.DirectTransfer;
  };

  const normalizeBooking = (b: any): Booking => {
    return {
      id: String(b.id || b.Id || ""),
      bookingCode: String(b.bookingCode || b.BookingCode || ""),
      roomId: String(b.roomId || b.RoomId || ""),
      guestId: String(b.guestId || b.GuestId || ""),
      guestFirstName: b.guestFirstName || b.GuestFirstName || "",
      guestLastName: b.guestLastName || b.GuestLastName || "",
      guestEmail: b.guestEmail || b.GuestEmail || "",
      guestPhone: b.guestPhone || b.GuestPhone || "",
      checkIn: b.checkIn || b.CheckIn || "",
      checkOut: b.checkOut || b.CheckOut || "",
      status: toCanonicalStatus(
        b.status || b.Status || BookingStatus.Pending,
      ) as BookingStatus,
      amount: Number(b.amount || b.Amount || 0),
      paymentStatus: toCanonicalPaymentStatus(
        b.paymentStatus || b.PaymentStatus || "Unpaid",
      ),
      paymentMethod: toCanonicalPaymentMethod(b.paymentMethod || b.PaymentMethod || ""),
      transactionReference:
        b.transactionReference || b.TransactionReference || "",
      createdAt: b.createdAt || b.CreatedAt || new Date().toISOString(),
      notes: b.notes || b.Notes || "",
      notificationMessage: b.notificationMessage || b.NotificationMessage || undefined,
      paymentExpiresAtUtc: b.paymentExpiresAtUtc || b.PaymentExpiresAtUtc || null,
      statusHistory: b.statusHistory || b.StatusHistory || [],
    };
  };

  const normalizeVisitRecord = (v: any): VisitRecord => {
    const rawAction = String(v.action || v.Action || "")
      .toLowerCase()
      .trim();
    let canonicalAction = VisitAction.RESERVATION;

    if (
      rawAction.includes("checkin") ||
      rawAction.includes("check in") ||
      rawAction.includes("entry")
    ) {
      canonicalAction = VisitAction.CHECK_IN;
    } else if (
      rawAction.includes("checkout") ||
      rawAction.includes("check out") ||
      rawAction.includes("exit")
    ) {
      canonicalAction = VisitAction.CHECK_OUT;
    } else if (
      rawAction.includes("void") ||
      rawAction.includes("cancel") ||
      rawAction.includes("dossier voided")
    ) {
      canonicalAction = VisitAction.VOID;
    } else if (
      rawAction.includes("reservation") ||
      rawAction.includes("made") ||
      rawAction.includes("booking")
    ) {
      canonicalAction = VisitAction.RESERVATION;
    }

    return {
      id: String(v.id || v.Id || ""),
      guestId: String(v.guestId || v.GuestId || ""),
      guestName: v.guestName || v.GuestName || "Guest",
      roomId: String(v.roomId || v.RoomId || ""),
      roomNumber: String(v.roomNumber || v.RoomNumber || "---"),
      bookingCode: String(v.bookingCode || v.BookingCode || "SYS-TRCE"),
      action: canonicalAction,
      timestamp: v.timestamp || v.Timestamp || new Date().toISOString(),
      authorizedBy: v.authorizedBy || v.AuthorizedBy || "System",
    };
  };

  const normalizeUser = (raw: any): AppUser | null => {
    if (!raw) return null;
    const data = raw.user || raw.profile || raw.data || raw;
    if (!data.id && !data.Id && !data.email && !data.Email) return null;

    const roleStr = String(data.role || data.Role || "Staff").toLowerCase();
    let canonicalRole = UserRole.Staff;

    if (roleStr.includes("admin")) canonicalRole = UserRole.Admin;
    else if (roleStr.includes("manager")) canonicalRole = UserRole.Manager;
    else if (roleStr.includes("client") || roleStr.includes("guest"))
      canonicalRole = UserRole.Client;

    const statusStr = String(
      data.status || data.Status || "Active",
    ).toLowerCase();
    const canonicalStatus =
      statusStr.includes("suspend") ||
      statusStr.includes("deactivate") ||
      statusStr.includes("locked")
        ? ProfileStatus.Suspended
        : ProfileStatus.Active;

    const phoneValue =
      data.phone || data.Phone || data.phoneNumber || data.PhoneNumber || "";
    const dateValue =
      data.onboardingDate ||
      data.OnboardingDate ||
      data.createdAt ||
      data.CreatedAt ||
      new Date().toISOString();

    return {
      id: String(data.id || data.Id || ""),
      name: data.name || data.fullName || data.Name || "Staff",
      email: data.email || data.Email || "",
      phone: phoneValue,
      role: canonicalRole,
      status: canonicalStatus,
      department: data.department || data.Department || "",
      avatarUrl:
        data.avatarUrl ||
        "/avatar-placeholder.svg",
      createdAt: dateValue,
    } as any;
  };

  const refreshData = useCallback(async (options: { silent?: boolean } = {}) => {
    const token = api.getToken();
    if (!token) {
      setIsInitialLoading(false);
      return;
    }

    try {
      const [
        roomsRes,
        bookingsRes,
        employeesRes,
        clientsRes,
        notificationsRes,
        auditLogsRes,
        visitHistoryRes,
      ] = await Promise.all([
        // Rooms and bookings are core dashboard data. Do not silently turn a
        // connectivity/authentication failure into a misleading empty hotel.
        api.get("/api/rooms"),
        api.get("/api/bookings"),
        api.get("/api/admin/management/employees").catch(() => null),
        api.get("/api/admin/management/clients").catch(() => null),
        api.get("/api/notifications/staff").catch(() => null),
        api.get("/api/audit-logs").catch(() => null),
        api.get("/api/visit-records").catch(() => null),
      ]);

      const rawRooms = normalizeData(roomsRes);
      const normalizedRooms = rawRooms.map((r: any) => {
        const rawStatus = String(r.status || r.Status || "Available")
          .toLowerCase()
          .replace(/[\s_-]/g, "");
        const statusMap: Record<string, RoomStatus> = {
          available: RoomStatus.Available,
          occupied: RoomStatus.Occupied,
          cleaning: RoomStatus.Cleaning,
          maintenance: RoomStatus.Maintenance,
          reserved: RoomStatus.Reserved,
        };

        const onlineVal = r.isOnline !== undefined ? r.isOnline : r.IsOnline;

        return {
          ...r,
          id: String(r.id || r.Id),
          roomNumber: String(r.roomNumber || r.RoomNumber || ""),
          category:
            (r.category || r.Category) === "PresidentialSuite"
              ? "Presidential Suite"
              : r.category || r.Category || "Standard",
          status: statusMap[rawStatus] || RoomStatus.Available,
          pricePerNight: Number(r.pricePerNight || r.PricePerNight || 0),
          isOnline:
            onlineVal === true ||
            onlineVal === "true" ||
            onlineVal === 1 ||
            onlineVal === "1",
        };
      });

      const normalizedEmployees =
        employeesRes === null
          ? null
          : normalizeData(employeesRes)
              .map((u) => normalizeUser(u))
              .filter((u): u is StaffUser => u !== null);
      const normalizedClients =
        clientsRes === null
          ? null
          : normalizeData(clientsRes)
              .map((u) => normalizeUser(u))
              .filter((u): u is StaffUser => u !== null);

      setRooms(normalizedRooms);
      setBookings(normalizeData(bookingsRes).map(normalizeBooking));
      setStaff((current) => {
        const employees =
          normalizedEmployees ??
          current.filter((profile) => profile.role !== UserRole.Client);
        const clients =
          normalizedClients ??
          current.filter((profile) => profile.role === UserRole.Client);
        return [...employees, ...clients].filter(
          (profile, index, profiles) =>
            profiles.findIndex((item) => item.id === profile.id) === index,
        );
      });
      if (notificationsRes !== null) {
        setNotifications(normalizeData(notificationsRes));
      }
      if (auditLogsRes !== null) {
        setAuditLogs(normalizeData(auditLogsRes));
      }
      if (clientsRes !== null) {
        setGuests(normalizeData(clientsRes));
      }
      if (visitHistoryRes !== null) {
        setVisitHistory(normalizeData(visitHistoryRes).map(normalizeVisitRecord));
      }
    } catch (error: any) {
      console.error("System Sync Failed:", error);
      if (!options.silent) {
        sileo.error({
          title: 'Connection Error',
          description: 'The system could not update. Some data might be old.'
        });
      }
      if (error.message?.includes("Authorization Required")) {
        setIsAuthenticated(false);
        api.removeToken();
      }
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    // Toast new notifications
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length > 0) {
      const latest = [...unread].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      const timeDiff = Date.now() - new Date(latest.createdAt).getTime();
      // Only toast if it's within last 10 seconds (recent)
      if (
        timeDiff < 10000 &&
        latest.id !== lastAnnouncedNotificationIdRef.current
      ) {
        lastAnnouncedNotificationIdRef.current = latest.id;
        sileo.show({
          title: latest.title,
          description: latest.message,
        });
      }
    }
  }, [notifications]);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      let active = true;
      const restoreSession = async () => {
        try {
          const data = await api.get<any>("/api/profile/me");
          const user = normalizeUser(data);
          if (!user) throw new Error("The signed-in profile could not be loaded.");
          if (user.role === UserRole.Client) {
            throw new Error("Guest accounts must use the guest website, not the staff dashboard.");
          }
          if (!active) return;
          // Establish the verified role before authentication becomes visible.
          // This prevents a valid Admin/Manager deep link being redirected by
          // the default Staff role during session restoration.
          setCurrentUser(user);
          setUserRole(user.role);
          setIsAuthenticated(true);
          await refreshData();
        } catch {
          if (!active) return;
          setIsAuthenticated(false);
          setCurrentUser(null);
          setUserRole(UserRole.Staff);
          api.removeToken();
        } finally {
          if (active) setIsInitialLoading(false);
        }
      };
      void restoreSession();
      return () => {
        active = false;
      };
    } else {
      setIsInitialLoading(false);
    }
  }, [refreshData]);

  const login = async (email: string, password?: string) => {
    const response = await api.post<any>("/api/Auth/login", {
      email,
      password,
    });
    const token =
      response.token || response.data?.token || response.accessToken;
    if (token) {
      api.setToken(token);
      const user = normalizeUser(response);
      if (user) {
        if (user.role === UserRole.Client) {
          api.removeToken();
          throw new Error("Guest accounts must use the guest website, not the staff dashboard.");
        }
        setCurrentUser(user);
        setUserRole(user.role);
      }
      setIsAuthenticated(true);
      await refreshData();
    } else {
      throw new Error("Could not log in.");
    }
  };

  const logout = () => {
    api.removeToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRole(UserRole.Staff);
    setRooms([]);
    setBookings([]);
    setGuests([]);
    setStaff([]);
    setNotifications([]);
    setAuditLogs([]);
    setVisitHistory([]);
    setSelectedBookingId(null);
    setSelectedGuestId(null);
    setSelectedRoomId(null);
    setSelectedPaymentBookingId(null);
    setSelectedProfileId(null);
    setSelectedVisitRecordId(null);
    setSelectedAuditLogId(null);
  };

  // const addRoom = async (room: Omit<Room, 'id'>) => {
  //   await api.post('/api/rooms', room);
  //   await refreshData();
  // };

const addRoom = async (room: Omit<Room, "id">) => {
  const formData = new FormData();

  formData.append("RoomNumber", room.roomNumber);
  formData.append("Name", room.name);
  formData.append(
    "Category",
    room.category === "Presidential Suite" ? "PresidentialSuite" : room.category,
  );
  formData.append("Floor", room.floor);
  formData.append("Status", room.status);
  formData.append("Size", room.size || "");
  formData.append("Description", room.description || "");
  formData.append("PricePerNight", String(room.pricePerNight || 0));
  formData.append("Capacity", String(room.capacity || 2));
  formData.append("IsOnline", String(room.isOnline ?? true));

  if (room.amenities) {
    room.amenities.forEach((a) => formData.append("Amenities", a));
  }

  if (room.images) {
    for (let i = 0; i < room.images.length; i++) {
      if (room.images[i].startsWith("data:image")) {
        const res = await fetch(room.images[i]);
        const blob = await res.blob();
        const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        formData.append("files", blob, `room_${i}.${extension}`);
      }
    }
  }

  // Use the NEW specialized method
  await api.postForm("/api/rooms", formData);

  await refreshData();
};



const updateRoom = async (id: string, updates: Partial<Room>) => {
  const formData = new FormData();

  if (updates.name !== undefined) formData.append("Name", updates.name);
  if (updates.category !== undefined) {
    formData.append(
      "Category",
      updates.category === "Presidential Suite" ? "PresidentialSuite" : updates.category,
    );
  }
  if (updates.floor !== undefined) formData.append("Floor", updates.floor);
  if (updates.status !== undefined) formData.append("Status", updates.status);
  if (updates.pricePerNight !== undefined) formData.append("PricePerNight", String(updates.pricePerNight));
  if (updates.capacity !== undefined) formData.append("Capacity", String(updates.capacity));
  if (updates.isOnline !== undefined) formData.append("IsOnline", String(updates.isOnline));
  if (updates.description !== undefined) formData.append("Description", updates.description);
  if (updates.size !== undefined) formData.append("Size", updates.size);
  if (updates.amenities !== undefined) {
    formData.append("ReplaceAmenities", "true");
    updates.amenities.forEach((a) => formData.append("Amenities", a));
  }

  if (updates.images !== undefined) {
    formData.append("ReplaceImages", "true");
    for (let i = 0; i < updates.images.length; i++) {
      const img = updates.images[i];
      if (img.startsWith("data:image")) {
        // New file upload
        const res = await fetch(img);
        const blob = await res.blob();
        const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        formData.append("files", blob, `update_room_${id}_${i}.${extension}`);
      } else {
        // Existing URL to keep in the DB
        formData.append("Images", img);
      }
    }
  }

  await api.putForm(`/api/rooms/${id}`, formData);
  await refreshData();
};


  const deleteRoom = async (id: string) => {
    await api.delete(`/api/rooms/${id}`);
    await refreshData();
  };

  const toggleRoomMaintenance = async (id: string) => {
    const room = rooms.find((r) => r.id === id);
    if (room) {
      const updatedRoom = {
        ...room,
        status:
          room.status === RoomStatus.Maintenance
            ? RoomStatus.Available
            : RoomStatus.Maintenance,
      };
      await updateRoom(id, updatedRoom);
    }
  };

  const addBooking = async (p: any): Promise<BookingInitResponse> => {
    const res = await api.post<any>("/api/bookings", p);
    const data = res.data || res.value || res;
    const response: BookingInitResponse = {
      bookingCode: String(data.bookingCode || data.BookingCode || ""),
      paymentUrl: data.paymentUrl || data.PaymentUrl || null,
      paymentInstruction:
        data.paymentInstruction || data.PaymentInstruction || null,
      amount: Number(data.amount || data.Amount || 0),
      status: (data.status ||
        data.Status ||
        BookingStatus.Pending) as BookingStatus,
      paymentStatus: (data.paymentStatus ||
        data.PaymentStatus ||
        PaymentStatus.Unpaid) as PaymentStatus,
      paymentExpiresAtUtc:
        data.paymentExpiresAtUtc || data.PaymentExpiresAtUtc || null,
    };

    await refreshData();
    return response;
  };

  const confirmTransfer = async (code: string, confirmationText: string) => {
    if (confirmationText !== "ACCEPT") {
      throw new Error('Type "ACCEPT" exactly to confirm this manual payment.');
    }

    // Keep the dashboard compatible with the current API while the backend moves
    // to server-generated manual confirmation references. The acknowledgement is
    // sent separately and must also be validated by the updated backend.
    const legacyManualReference = `MANUAL-${code.toUpperCase()}-${crypto.randomUUID()}`;
    await api.post(`/api/bookings/${code}/confirm-transfer`, {
      confirmationText,
      confirmationMethod: "TypedAcknowledgement",
      transactionReference: legacyManualReference,
    });
    await refreshData();
  };

  const verifyMonnify = async (code: string) => {
    // The API verifies only the server-owned reference saved when checkout was
    // initialized. Staff must never type or override a Monnify reference.
    await api.post(`/api/bookings/${code}/verify-monnify`);
    await refreshData();
  };

  /**
   * CHANGE: Implemented specialized cancellation API call.
   * Includes mandatory reason parameter.
   */
  const cancelBooking = async (
    id: string,
    reason: string = "Staff Requested Cancellation",
  ) => {
    await api.post(`/api/bookings/${id}/cancel`, null, { params: { reason } });
    await refreshData();
  };

  /**
   * CHANGE: Implemented specialized complete-refund API call.
   * Includes mandatory transactionRef parameter.
   */
  const completeRefund = async (id: string, transactionRef: string) => {
    await api.post(`/api/bookings/${id}/complete-refund`, null, {
      params: { transactionRef },
    });
    await refreshData();
  };

  const checkInBooking = async (id: string) => {
    await api.put(`/api/bookings/${id}/status`, null, {
      params: { status: "CheckedIn" },
    });
    await refreshData();
  };
  const checkOutBooking = async (id: string) => {
    await api.put(`/api/bookings/${id}/status`, null, {
      params: { status: "CheckedOut" },
    });
    await refreshData();
  };
  const checkInBookingByCode = async (code: string) => {
    const b = bookings.find((x) => x.bookingCode === code);
    if (b) await checkInBooking(b.id);
    else
      throw new Error(
        "Error: Booking ID not found.",
      );
  };

  const addGuest = async (g: any) => {
    const res = await api.post<any>("/api/Auth/register", g);
    await refreshData();
    return res.email;
  };

  const parseLocalMidnight = (dateStr: string) => {
    if (!dateStr) return new Date();
    const s = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const isRoomAvailable = (
    roomId: string,
    checkIn: string,
    checkOut: string,
    excludeBookingId?: string,
  ): boolean => {
    const start = parseLocalMidnight(checkIn);
    const end = parseLocalMidnight(checkOut);

    return !bookings.some((b) => {
      const isCorrectRoom = b.roomId === roomId;
      const isNotExcluded = b.id !== excludeBookingId;

      const bStatus = String(b.status || "").toLowerCase();
      const isActive = bStatus !== "cancelled" && bStatus !== "checkedout";

      if (!isCorrectRoom || !isNotExcluded || !isActive) return false;

      const bStart = parseLocalMidnight(b.checkIn);
      const bEnd = parseLocalMidnight(b.checkOut);

      return start < bEnd && end > bStart;
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };
  const markNotificationAsRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };
  const markAllNotificationsRead = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.isRead)
        .map((n) => api.patch(`/api/notifications/${n.id}/read`)),
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const addStaff = async (p: any) => {
    const payload = {
      fullName: p.name,
      email: p.email,
      phoneNumber: p.phone,
      phone: p.phone,
      assignedRole: String(p.role).toLowerCase(),
      status: String(p.status).toLowerCase(),
      department: p.department || "",
    };
    await api.post("/api/admin/management/onboard-staff", payload);
    await refreshData();
  };

  const updateStaff = async (id: string, updates: Partial<StaffUser>) => {
    await api.put(`/api/admin/management/employees/${id}`, {
      fullName: updates.name,
      email: updates.email,
      phone: updates.phone,
      assignedRole: updates.role,
      department: updates.department,
    });
    await refreshData();
  };

  const toggleStaffStatus = async (id: string) => {
    const s = staff.find((x) => x.id === id);
    if (s) {
      const isActive =
        s.status === ProfileStatus.Active ||
        String(s.status).toLowerCase() === "active";
      const endpoint = isActive ? "deactivate" : "activate";
      await api.post(`/api/admin/management/accounts/${id}/${endpoint}`, null);
      await refreshData();
    }
  };

  const updateCurrentUserProfile = async (
    updates: Partial<AppUser>,
    options: { persist?: boolean } = {},
  ) => {
    if (options.persist !== false) {
      await api.put("/api/profile/me", {
        fullName: updates.name,
        phone: updates.phone,
        avatarUrl: updates.avatarUrl,
      });
    }
    if (currentUser) setCurrentUser({ ...currentUser, ...updates });
  };

  const value = {
    rooms,
    bookings,
    guests,
    staff,
    notifications,
    auditLogs,
    visitHistory,
    userRole,
    currentUser,
    isAuthenticated,
    isInitialLoading,
    isSidebarCollapsed,
    activeTab,
    selectedBookingId,
    setSelectedBookingId,
    selectedGuestId,
    setSelectedGuestId,
    selectedRoomId,
    setSelectedRoomId,
    selectedPaymentBookingId,
    setSelectedPaymentBookingId,
    selectedProfileId,
    setSelectedProfileId,
    selectedVisitRecordId,
    setSelectedVisitRecordId,
    selectedAuditLogId,
    setSelectedAuditLogId,
    setActiveTab,
    toggleSidebar: () => setIsSidebarCollapsed(!isSidebarCollapsed),
    login,
    logout,
    setUserRole,
    addRoom,
    updateRoom,
    deleteRoom,
    toggleRoomMaintenance,
    addBooking,
    confirmTransfer,
    verifyMonnify,
    checkInBooking,
    checkOutBooking,
    checkInBookingByCode,
    cancelBooking,
    completeRefund,
    addGuest,
    isRoomAvailable,
    dismissNotification,
    markNotificationAsRead,
    markAllNotificationsRead,
    addStaff,
    updateStaff,
    toggleStaffStatus,
    updateCurrentUserProfile,
    refreshData,
  };

  return (
    <HotelContext.Provider value={value}>{children}</HotelContext.Provider>
  );
};
