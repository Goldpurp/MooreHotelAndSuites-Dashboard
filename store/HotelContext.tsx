import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
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
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  confirmTransfer: (bookingCode: string) => Promise<void>;
  checkInBooking: (bookingId: string) => Promise<void>;
  checkOutBooking: (bookingId: string) => Promise<void>;
  checkInBookingByCode: (code: string) => Promise<void>;
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
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
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
  updateCurrentUserProfile: (updates: Partial<AppUser>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

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
      paymentMethod: b.paymentMethod || b.PaymentMethod || "",
      transactionReference:
        b.transactionReference || b.TransactionReference || "",
      createdAt: b.createdAt || b.CreatedAt || new Date().toISOString(),
      notes: b.notes || b.Notes || "",
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
      guestName: v.guestName || v.GuestName || "Anonymous Resident",
      roomId: String(v.roomId || v.RoomId || ""),
      roomNumber: String(v.roomNumber || v.RoomNumber || "---"),
      bookingCode: String(v.bookingCode || v.BookingCode || "SYS-TRCE"),
      action: canonicalAction,
      timestamp: v.timestamp || v.Timestamp || new Date().toISOString(),
      authorizedBy: v.authorizedBy || v.AuthorizedBy || "System Protocol",
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
      name: data.name || data.fullName || data.Name || "Personnel",
      email: data.email || data.Email || "",
      phone: phoneValue,
      role: canonicalRole,
      status: canonicalStatus,
      department: data.department || data.Department || "",
      avatarUrl:
        data.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "P")}&background=020617&color=fff`,
      createdAt: dateValue,
    } as any;
  };

  const refreshData = useCallback(async () => {
    const token = api.getToken();
    if (!token) return;

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
        api.get("/api/rooms").catch(() => []),
        api.get("/api/bookings").catch(() => []),
        api.get("/api/admin/management/employees").catch(() => []),
        api.get("/api/admin/management/clients").catch(() => []),
        api.get("/api/notifications/staff").catch(() => []),
        api.get("/api/audit-logs").catch(() => []),
        api.get("/api/visit-records").catch(() => []),
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
          category: r.category || r.Category || "Standard",
          status: statusMap[rawStatus] || RoomStatus.Available,
          pricePerNight: Number(r.pricePerNight || r.PricePerNight || 0),
          isOnline:
            onlineVal === true ||
            onlineVal === "true" ||
            onlineVal === 1 ||
            onlineVal === "1",
        };
      });

      const allUsersRaw = [
        ...normalizeData(employeesRes),
        ...normalizeData(clientsRes),
      ];

      const mergedStaff = allUsersRaw
        .map((u) => normalizeUser(u))
        .filter((u): u is StaffUser => u !== null)
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

      setRooms(normalizedRooms);
      setBookings(normalizeData(bookingsRes).map(normalizeBooking));
      setStaff(mergedStaff);
      setNotifications(normalizeData(notificationsRes));
      setAuditLogs(normalizeData(auditLogsRes));
      setGuests(normalizeData(clientsRes));
      setVisitHistory(normalizeData(visitHistoryRes).map(normalizeVisitRecord));
    } catch (error: any) {
      console.error("Property Synchronization Protocol Failed:", error);
      if (error.message?.includes("Authorization Required")) {
        setIsAuthenticated(false);
        api.removeToken();
      }
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
      api
        .get<any>("/api/profile/me")
        .then((data) => {
          const user = normalizeUser(data);
          if (user) {
            setCurrentUser(user);
            setUserRole(user.role);
          }
        })
        .catch(() => {
          setIsAuthenticated(false);
          api.removeToken();
        })
        .finally(() => {
          refreshData();
        });
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
        setCurrentUser(user);
        setUserRole(user.role);
      }
      setIsAuthenticated(true);
      await refreshData();
    } else {
      throw new Error("Authorization protocol failed.");
    }
  };

  const logout = () => {
    api.removeToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRole(UserRole.Staff);
  };

  // const addRoom = async (room: Omit<Room, 'id'>) => {
  //   await api.post('/api/rooms', room);
  //   await refreshData();
  // };

const addRoom = async (room: Omit<Room, "id">) => {
  const formData = new FormData();

  formData.append("RoomNumber", room.roomNumber);
  formData.append("Name", room.name);
  formData.append("Category", room.category);
  formData.append("Floor", room.floor);
  formData.append("Status", room.status);
  formData.append("Size", room.size || "");
  formData.append("Description", room.description || "");
  formData.append("PricePerNight", String(room.pricePerNight || 0));
  formData.append("Guest", String(room.capacity || 2));

  if (room.amenities) {
    room.amenities.forEach((a) => formData.append("Amenities", a));
  }

  if (room.images) {
    for (let i = 0; i < room.images.length; i++) {
      if (room.images[i].startsWith("data:image")) {
        const res = await fetch(room.images[i]);
        const blob = await res.blob();
        formData.append("files", blob, `room_${i}.jpg`);
      }
    }
  }

  // Use the NEW specialized method
  await api.postForm("/api/rooms", formData);

  await refreshData();
};



const updateRoom = async (id: string, updates: Partial<Room>) => {
  const formData = new FormData();
  formData.append("Id", id);

  // Map updated fields
  if (updates.roomNumber) formData.append("RoomNumber", updates.roomNumber);
  if (updates.name) formData.append("Name", updates.name);
  if (updates.status) formData.append("Status", updates.status);
  if (updates.pricePerNight !== undefined) formData.append("PricePerNight", String(updates.pricePerNight));
  if (updates.capacity !== undefined) formData.append("Guest", String(updates.capacity));
  if (updates.size) formData.append("Size", updates.size);

  if (updates.images) {
    for (let i = 0; i < updates.images.length; i++) {
      const img = updates.images[i];
      if (img.startsWith("data:image")) {
        const res = await fetch(img);
        const blob = await res.blob();
        formData.append("files", blob, `update_${id}_${i}.jpg`);
      } else {
        formData.append("ExistingImages", img);
      }
    }
  }

  await api.put(`/api/rooms/${id}`, formData);
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
    };

    await refreshData();
    return response;
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    await api.put(`/api/bookings/${id}`, { ...updates, id });
    await refreshData();
  };
  const updatePaymentStatus = async (id: string, status: PaymentStatus) => {
    await api.put(`/api/bookings/${id}`, { id, paymentStatus: status });
    await refreshData();
  };

  const confirmTransfer = async (code: string) => {
    await api.post(`/api/bookings/${code}/confirm-transfer`);
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
        "Identifier mismatch: Dossier code not found in current view.",
      );
  };

  const addGuest = async (g: any) => {
    const res = await api.post<any>("/api/Auth/register", g);
    await refreshData();
    return res.email;
  };
  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    await api.put(`/api/profile/me`, updates);
    await refreshData();
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
      temporaryPassword: p.password,
      assignedRole: String(p.role).toLowerCase(),
      status: String(p.status).toLowerCase(),
      department: p.department || "",
    };
    await api.post("/api/admin/management/onboard-staff", payload);
    await refreshData();
  };

  const updateStaff = async (id: string, updates: Partial<StaffUser>) => {
    await api.put(`/api/admin/management/employees/${id}`, { ...updates, id });
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

  const updateCurrentUserProfile = async (updates: Partial<AppUser>) => {
    await api.put("/api/profile/me", updates);
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
    updateBooking,
    updatePaymentStatus,
    confirmTransfer,
    checkInBooking,
    checkOutBooking,
    checkInBookingByCode,
    cancelBooking,
    completeRefund,
    addGuest,
    updateGuest,
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
