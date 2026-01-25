
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Room, Booking, Guest, RoomStatus, BookingStatus, AppNotification, UserRole, AppUser, StaffUser, AuditLog, VisitRecord, VisitAction, PaymentStatus } from '../types';
import { api } from '../lib/api';

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
  addRoom: (room: Omit<Room, 'id'>) => Promise<void>;
  updateRoom: (id: string, updates: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  toggleRoomMaintenance: (id: string) => Promise<void>;
  addBooking: (payload: any) => Promise<Booking>;
  updateBooking: (id: string, updates: Partial<Booking>) => Promise<void>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  confirmTransfer: (bookingCode: string) => Promise<void>;
  checkInBooking: (bookingId: string) => Promise<void>;
  checkOutBooking: (bookingId: string) => Promise<void>;
  checkInBookingByCode: (code: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  addGuest: (guest: Omit<Guest, 'id' | 'totalStays' | 'totalSpent'>) => Promise<string>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
  isRoomAvailable: (roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string) => boolean;
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

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [userRole, setUserRole] = useState<UserRole>('staff');
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const pollInterval = useRef<number | null>(null);
  const isUpdating = useRef(false);
  const transitionLocks = useRef<Map<string, { status: any, expiry: number, type: 'booking' | 'room' | 'payment' }>>(new Map());

  const normalizeUser = (raw: any): AppUser | null => {
    if (!raw) return null;
    const data = raw.user || raw.profile || raw.data || raw;
    return {
      id: String(data.id || data.Id).toLowerCase(),
      name: data.name || data.fullName || data.Name || "Personnel",
      email: data.email || data.Email || "",
      role: (String(data.role || data.Role || data.assignedRole || 'staff').toLowerCase() as UserRole),
      avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.fullName || 'P')}&background=020617&color=fff`
    };
  };

  const normalizeBooking = (b: any): Booking => {
    const id = String(b.id || b.Id || b.bookingId).toLowerCase();
    const lock = transitionLocks.current.get(id);
    
    const statusMap: Record<string, BookingStatus> = {
      'Pending': BookingStatus.PENDING,
      'Confirmed': BookingStatus.CONFIRMED,
      'CheckedIn': BookingStatus.CHECKED_IN,
      'CheckedOut': BookingStatus.CHECKED_OUT,
      'Cancelled': BookingStatus.CANCELLED
    };
    
    let status = statusMap[b.status || b.Status] || BookingStatus.PENDING;
    let paymentStatus = (b.paymentStatus || b.PaymentStatus || 'Unpaid') as PaymentStatus;

    if (lock && Date.now() < lock.expiry) {
      if (lock.type === 'booking') status = lock.status as BookingStatus;
      if (lock.type === 'payment') paymentStatus = lock.status as PaymentStatus;
    } else if (lock) {
      transitionLocks.current.delete(id);
    }

    return {
      id, 
      bookingCode: b.bookingCode || b.BookingCode || "", 
      roomId: String(b.roomId || b.RoomId || "").toLowerCase(), 
      guestId: String(b.guestId || b.GuestId || "").toLowerCase(),
      guestFirstName: b.guestFirstName || b.guestName?.split(' ')[0] || b.GuestFirstName || "",
      guestLastName: b.guestLastName || b.guestName?.split(' ')[1] || b.GuestLastName || "",
      guestEmail: b.guestEmail || b.email || b.GuestEmail || "",
      guestPhone: b.guestPhone || b.phone || b.GuestPhone || "", 
      checkIn: b.checkIn || b.CheckIn || "",
      checkOut: b.checkOut || b.CheckOut || "", 
      status, 
      amount: b.amount || b.Amount || 0,
      paymentStatus,
      paymentMethod: b.paymentMethod || b.PaymentMethod || "", 
      createdAt: b.createdAt || b.CreatedAt || "",
      notes: b.notes || b.Notes || "", 
      statusHistory: b.statusHistory || b.StatusHistory || []
    };
  };

  const normalizeAction = (action: string): VisitAction => {
    const a = (action || "").toLowerCase().replace(/\s/g, '');
    if (a.includes('checkin') || a === 'checkedin') return VisitAction.CHECK_IN;
    if (a.includes('checkout') || a === 'checkedout') return VisitAction.CHECK_OUT;
    if (a.includes('reservation') || a.includes('booking')) return VisitAction.RESERVATION;
    if (a.includes('void') || a.includes('cancel')) return VisitAction.VOID;
    return VisitAction.RESERVATION;
  };

  const fetchData = useCallback(async () => {
    if (isUpdating.current) return;
    const token = api.getToken();
    
    if (!token) {
      setIsInitialLoading(false);
      setIsAuthenticated(false);
      return;
    }

    try {
      const [profileResponse, roomsData, bookingsData, guestsData, staffData, ledgerData, auditData, notificationsData] = await Promise.all([
        api.get<any>('/api/profile/me').catch(() => null),
        api.get<any[]>('/api/rooms').catch(() => []),
        api.get<any[]>('/api/bookings').catch(() => []),
        api.get<any[]>('/api/admin/management/clients').catch(() => []),
        api.get<any[]>('/api/admin/management/employees').catch(() => []),
        api.get<any[]>('/api/operations/ledger', { silent: true }).catch(() => null), 
        api.get<any[]>('/api/audit-logs').catch(() => []),
        api.get<AppNotification[]>('/api/Notifications/staff').catch(() => [])
      ]);

      if (profileResponse) {
        const user = normalizeUser(profileResponse);
        if (user) {
          setCurrentUser(user);
          setUserRole(user.role);
          setIsAuthenticated(true);
        }
      }

      setNotifications(notificationsData || []);

      const normalizedRooms = (roomsData || []).map(r => {
        const id = String(r.id || r.Id || r.roomId).toLowerCase();
        const lock = transitionLocks.current.get(id);
        let status = (r.status || r.Status || RoomStatus.AVAILABLE) as RoomStatus;
        if (lock && lock.type === 'room' && Date.now() < lock.expiry) status = lock.status as RoomStatus;
        return {
          id,
          roomNumber: r.roomNumber || r.RoomNumber,
          name: r.name || r.Name || "",
          category: r.category || r.Category || "Standard",
          floor: r.floor || r.Floor || "GroundFloor",
          status,
          pricePerNight: r.pricePerNight || r.PricePerNight || 0,
          capacity: r.capacity || r.Capacity || 2,
          size: r.size || r.Size || "25 sqm",
          description: r.description || r.Description || "",
          amenities: r.amenities || r.Amenities || [],
          images: r.images || r.Images || [],
          isOnline: r.isOnline !== undefined ? r.isOnline : true,
        };
      });
      setRooms(normalizedRooms);

      const normalizedBookings = (bookingsData || []).map(normalizeBooking);
      setBookings(normalizedBookings);

      const uniqueGuestMap = new Map<string, Guest>();
      (guestsData || []).forEach(g => {
        const email = (g.email || g.Email || "").toLowerCase().trim();
        if (!email) return;
        uniqueGuestMap.set(email, {
          id: String(g.id || g.Id).toLowerCase(),
          firstName: g.firstName || g.FirstName || "",
          lastName: g.lastName || g.LastName || "",
          email,
          phone: g.phone || g.Phone || "",
          totalStays: g.totalStays || g.TotalStays || 0,
          totalSpent: g.totalSpent || g.TotalSpent || 0,
          avatarUrl: g.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.firstName || 'G')}&background=020617&color=fff`,
          isVIP: g.isVIP || g.IsVIP || false
        });
      });

      normalizedBookings.forEach(b => {
        const email = (b.guestEmail || "").toLowerCase().trim();
        if (!email) return;
        if (uniqueGuestMap.has(email)) {
          const entry = uniqueGuestMap.get(email)!;
          if (b.guestPhone) entry.phone = b.guestPhone;
        } else {
          uniqueGuestMap.set(email, {
            id: b.guestId && b.guestId.length > 20 ? b.guestId.toLowerCase() : `walkin-${email}`,
            firstName: b.guestFirstName,
            lastName: b.guestLastName,
            email,
            phone: b.guestPhone,
            totalStays: 1,
            totalSpent: b.amount,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(b.guestFirstName || 'G')}&background=020617&color=fff`,
            isVIP: false
          });
        }
      });
      setGuests(Array.from(uniqueGuestMap.values()));

      setStaff((staffData || []).map(s => ({
        id: String(s.id || s.Id).toLowerCase(),
        name: s.fullName || s.Name || "Personnel",
        email: s.email || s.Email || "",
        role: (String(s.assignedRole || s.role || s.Role || 'staff').toLowerCase() as UserRole),
        status: (s.status || s.Status || 'Active') as 'Active' | 'Suspended',
        createdAt: s.createdAt || s.CreatedAt || new Date().toISOString(),
        avatarUrl: s.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName || 'S')}&background=020617&color=fff`
      })));

      setAuditLogs((auditData || []).map(a => ({
        id: String(a.id || a.Id).toLowerCase(),
        profileId: a.profileId || "System",
        action: a.action || "Log",
        entityType: a.entityType || "Unknown",
        entityId: a.entityId || "0",
        createdAt: a.createdAt || new Date().toISOString()
      })));

      const historyMap = new Map<string, VisitRecord>();

      if (ledgerData && Array.isArray(ledgerData)) {
        ledgerData.forEach(l => {
          const id = String(l.id || l.Id).toLowerCase();
          historyMap.set(id, {
            id,
            guestId: l.occupantEmail || "",
            guestName: l.occupantName || "Unknown Guest",
            roomId: "", 
            roomNumber: l.assetNumber || "---",
            bookingCode: "---",
            action: normalizeAction(l.action),
            timestamp: l.timestamp || new Date().toISOString(),
            authorizedBy: l.verificationInfo || "System Authorized"
          });
        });
      }

      normalizedBookings.forEach(b => {
        const roomNum = normalizedRooms.find(r => r.id === b.roomId)?.roomNumber || "---";
        const guestName = `${b.guestFirstName} ${b.guestLastName}`.trim() || "Walk-In Guest";

        const reservationId = `synth-${b.id}-res`;
        if (!historyMap.has(reservationId)) {
          historyMap.set(reservationId, {
            id: reservationId,
            guestId: b.guestId || b.id,
            guestName,
            roomId: b.roomId,
            roomNumber: roomNum,
            bookingCode: b.bookingCode,
            action: VisitAction.RESERVATION,
            timestamp: b.createdAt || new Date().toISOString(),
            authorizedBy: "System Protocol"
          });
        }

        if (b.statusHistory && b.statusHistory.length > 0) {
          b.statusHistory.forEach((sh, idx) => {
            const histId = `synth-${b.id}-hist-${idx}`;
            if (!historyMap.has(histId)) {
              let action: VisitAction | null = null;
              switch(sh.status) {
                case BookingStatus.CHECKED_IN: action = VisitAction.CHECK_IN; break;
                case BookingStatus.CHECKED_OUT: action = VisitAction.CHECK_OUT; break;
                case BookingStatus.CANCELLED: action = VisitAction.VOID; break;
              }
              if (action) {
                historyMap.set(histId, {
                  id: histId,
                  guestId: b.guestId || b.id,
                  guestName,
                  roomId: b.roomId,
                  roomNumber: roomNum,
                  bookingCode: b.bookingCode,
                  action,
                  timestamp: sh.timestamp,
                  authorizedBy: "Audit Record"
                });
              }
            }
          });
        }
      });

      setVisitHistory(Array.from(historyMap.values()).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
      
    } catch (e) {
      console.error("[MHS Sync Fault]", e);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    pollInterval.current = window.setInterval(fetchData, 45000);
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [fetchData]);

  const commitStatusUpdate = async (id: string, newStatus: BookingStatus | RoomStatus, entity: 'booking' | 'room') => {
    isUpdating.current = true;
    const statusMap: Record<string, string> = {
      [BookingStatus.PENDING]: 'Pending', 
      [BookingStatus.CONFIRMED]: 'Confirmed', 
      [BookingStatus.CHECKED_IN]: 'CheckedIn', 
      [BookingStatus.CHECKED_OUT]: 'CheckedOut', 
      [BookingStatus.CANCELLED]: 'Cancelled',
      [RoomStatus.AVAILABLE]: 'Available', 
      [RoomStatus.OCCUPIED]: 'Occupied', 
      [RoomStatus.CLEANING]: 'Cleaning', 
      [RoomStatus.MAINTENANCE]: 'Maintenance'
    };

    const statusValue = statusMap[newStatus] || String(newStatus);
    const endpoint = entity === 'booking' ? `/api/bookings/${id}/status` : `/api/rooms/${id}`;

    try {
      if (entity === 'room') {
        await api.put(endpoint, { status: statusValue });
      } else {
        await api.put(endpoint, null, { params: { status: statusValue } });
      }
      transitionLocks.current.set(id, { status: newStatus, expiry: Date.now() + 5000, type: entity });
    } catch (err: any) {
      console.error(`[Ledger Reject] Status Update Fault for ${id}:`, err);
      throw err; 
    } finally {
      setTimeout(() => { isUpdating.current = false; fetchData(); }, 1500);
    }
  };

  const contextValue: HotelContextType = {
    rooms, bookings, guests, staff, notifications, auditLogs, visitHistory, userRole, isAuthenticated, isInitialLoading, isSidebarCollapsed, currentUser, activeTab,
    selectedBookingId, setSelectedBookingId, selectedGuestId, setSelectedGuestId, selectedRoomId, setSelectedRoomId,
    setActiveTab, 
    login: async (e, p) => { 
        const res = await api.post<any>('/api/auth/login', { email: e, password: p });
        api.setToken(res.token);
        setIsAuthenticated(true);
        await fetchData();
    },
    logout: () => { api.removeToken(); setIsAuthenticated(false); setCurrentUser(null); },
    setUserRole, toggleSidebar: () => setIsSidebarCollapsed(!isSidebarCollapsed),
    addRoom: async (r) => { 
      await api.post('/api/rooms', r); 
      fetchData(); 
    },
    updateRoom: async (id, u) => { 
      await api.put(`/api/rooms/${id}`, u); 
      fetchData(); 
    },
    deleteRoom: async (id) => { 
      await api.delete(`/api/rooms/${id}`); 
      fetchData(); 
    },
    toggleRoomMaintenance: async (id) => { 
      const rid = String(id).toLowerCase();
      const r = rooms.find(rm => rm.id === rid);
      if (r) {
        const nextStatus = r.status === RoomStatus.MAINTENANCE ? RoomStatus.AVAILABLE : RoomStatus.MAINTENANCE;
        await commitStatusUpdate(id, nextStatus, 'room');
      }
    },
    addBooking: async (p) => { 
      const payload = {
        roomId: p.roomId,
        guestFirstName: p.guestFirstName,
        guestLastName: p.guestLastName,
        guestEmail: p.guestEmail,
        guestPhone: p.guestPhone,
        checkIn: `${p.checkIn}T14:00:00.000Z`,
        checkOut: `${p.checkOut}T11:00:00.000Z`,
        paymentMethod: p.paymentMethod === 'Bank Transfer' ? 'DirectTransfer' : 'Paystack',
        notes: p.notes || ""
      };
      
      const r = await api.post<any>('/api/bookings', payload); 
      fetchData(); 
      return normalizeBooking(r);
    },
    updateBooking: async (id, u) => { 
      await api.put(`/api/bookings/${id}`, u); 
      fetchData(); 
    },
    updatePaymentStatus: async (id, status) => {
      const b = bookings.find(x => x.id === id);
      if (b && status === PaymentStatus.PAID) {
        await api.post(`/api/bookings/${b.bookingCode}/confirm-transfer`);
      } else {
        await api.put(`/api/bookings/${id}`, { paymentStatus: status });
      }
      transitionLocks.current.set(id, { status, expiry: Date.now() + 5000, type: 'payment' });
      fetchData();
    },
    confirmTransfer: async (code) => {
      await api.post(`/api/bookings/${code}/confirm-transfer`);
      fetchData();
    },
    checkInBooking: async (id) => { 
      await commitStatusUpdate(id, BookingStatus.CHECKED_IN, 'booking'); 
    },
    checkOutBooking: async (id) => { 
      await commitStatusUpdate(id, BookingStatus.CHECKED_OUT, 'booking'); 
    },
    checkInBookingByCode: async (code) => { 
      const booking = bookings.find(b => b.bookingCode === code);
      if (booking) await commitStatusUpdate(booking.id, BookingStatus.CHECKED_IN, 'booking');
    }, 
    cancelBooking: async (id) => { 
      await commitStatusUpdate(id, BookingStatus.CANCELLED, 'booking'); 
    },
    addGuest: async (g) => { 
      const r = await api.post<any>('/api/auth/register', g); 
      fetchData(); 
      return r.email; 
    },
    updateGuest: async (id, u) => {
      await api.put(`/api/profile/me`, u); 
      fetchData();
    }, 
    isRoomAvailable: (rid, cin, cout, eid) => {
      const t1 = new Date(cin).getTime(); 
      const t2 = new Date(cout).getTime();
      return !bookings.some(b => 
        b.id !== String(eid).toLowerCase() && 
        b.roomId === String(rid).toLowerCase() && 
        b.status !== BookingStatus.CANCELLED && 
        b.status !== BookingStatus.CHECKED_OUT && 
        t1 < new Date(b.checkOut).getTime() && 
        t2 > new Date(b.checkIn).getTime()
      );
    }, 
    dismissNotification: (id) => setNotifications(n => n.filter(x => x.id !== id)),
    markNotificationAsRead: async (id) => {
      try {
        await api.patch(`/api/Notifications/${id}/read`);
        setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      }
    },
    markAllNotificationsRead: async () => {
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length === 0) return;

      // Update locally first for instant feedback
      setNotifications(n => n.map(x => ({...x, isRead: true})));

      // Sync unread status to backend. 
      // Ideally there would be a bulk endpoint, but since not provided, we loop.
      try {
        await Promise.all(unread.map(n => api.patch(`/api/Notifications/${n.id}/read`)));
      } catch (err) {
        console.error("Failed to sync some notification read states", err);
      }
    },
    addStaff: async (p) => { 
      await api.post('/api/admin/management/onboard-staff', {
        fullName: p.name, 
        email: p.email, 
        temporaryPassword: p.password, 
        assignedRole: p.role.charAt(0).toUpperCase() + p.role.slice(1), 
        status: p.status || 'Active'
      }); 
      fetchData(); 
    }, 
    updateStaff: async (id, u) => { 
      await api.put(`/api/admin/management/employees/${id}`, {
        fullName: u.name, 
        email: u.email, 
        assignedRole: u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : undefined, 
        status: u.status
      }); 
      fetchData(); 
    }, 
    toggleStaffStatus: async (id) => { 
      const target = staff.find(s => s.id === id);
      if (target) {
        const action = target.status === 'Active' ? 'deactivate' : 'activate';
        await api.post(`/api/admin/management/accounts/${id}/${action}`); 
      }
      fetchData(); 
    }, 
    updateCurrentUserProfile: async (u) => { 
      await api.put<any>('/api/profile/me', u); 
      fetchData(); 
    },
    refreshData: fetchData
  };

  return <HotelContext.Provider value={contextValue}>{children}</HotelContext.Provider>;
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) throw new Error("Hotel Context Disconnected.");
  return context;
};
