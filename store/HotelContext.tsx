import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Room, Booking, Guest, RoomStatus, BookingStatus, AppNotification, UserRole, AppUser, StaffUser, AuditLog, VisitRecord, PaymentStatus, VisitAction } from '../types';
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

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};

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
  const [userRole, setUserRole] = useState<UserRole>('Staff');
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const normalizeData = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data && Array.isArray(res.data)) return res.data;
    if (res.items && Array.isArray(res.items)) return res.items;
    return [];
  };

  const normalizeUser = (raw: any): AppUser | null => {
    if (!raw) return null;
    const data = raw.user || raw.profile || raw.data || raw;
    
    let role: UserRole = 'Staff';
    const rawRole = String(data.role || data.Role || 'Staff').toLowerCase();
    if (rawRole === 'admin') role = 'Admin';
    else if (rawRole === 'manager') role = 'Manager';
    else if (rawRole === 'client') role = 'Client';

    return {
      id: String(data.id || data.Id || "").toLowerCase(),
      name: data.name || data.fullName || data.Name || "Personnel",
      email: data.email || data.Email || "",
      role: role,
      avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'P')}&background=020617&color=fff`
    };
  };

  const refreshData = useCallback(async () => {
    const token = api.getToken();
    if (!token) return;

    try {
      const [roomsRes, bookingsRes, guestsRes, staffRes, notificationsRes, auditLogsRes, ledgerRes] = await Promise.all([
        api.get('/api/rooms').catch(() => []),
        api.get('/api/bookings').catch(() => []),
        api.get('/api/admin/management/clients').catch(() => []),
        api.get('/api/admin/management/employees').catch(() => []),
        api.get('/api/notifications/staff').catch(() => []),
        api.get('/api/audit-logs').catch(() => []),
        api.get('/api/operations/ledger').catch(() => null) 
      ]);

      setRooms(normalizeData(roomsRes));
      setBookings(normalizeData(bookingsRes));
      setStaff(normalizeData(staffRes).map(s => normalizeUser(s) as StaffUser).filter(Boolean));
      setNotifications(normalizeData(notificationsRes));
      setAuditLogs(normalizeData(auditLogsRes));

      // STRICT DE-DUPLICATION LOGIC
      const rawGData = normalizeData(guestsRes);
      const guestMap: Map<string, Guest> = new Map();
      rawGData.forEach(g => {
        if (!g) return;
        const normalizedId = String(g.id || g.Id || '').toLowerCase();
        if (normalizedId) {
          guestMap.set(normalizedId, {
            id: normalizedId,
            firstName: g.firstName || g.FirstName || 'Guest',
            lastName: g.lastName || g.LastName || '',
            email: g.email || g.Email || '',
            phone: g.phone || g.Phone || '',
            totalStays: Number(g.totalStays || g.TotalStays || 0),
            totalSpent: Number(g.totalSpent || g.TotalSpent || 0),
            avatarUrl: g.avatarUrl || g.AvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.firstName || 'G')}&background=020617&color=fff`,
            isVIP: Boolean(g.isVIP || g.IsVIP)
          });
        }
      });
      setGuests(Array.from(guestMap.values()));

      const ledger = normalizeData(ledgerRes);
      if (ledger.length > 0) {
        setVisitHistory(ledger.map((l: any) => ({
          id: l.id || l.Id || Math.random().toString(),
          guestId: l.guestId || l.GuestId || '',
          guestName: l.guestName || l.GuestName || 'Occupant',
          roomId: l.roomId || l.RoomId || '',
          roomNumber: l.roomNumber || l.RoomNumber || 'N/A',
          bookingCode: l.bookingCode || l.BookingCode || 'N/A',
          action: (l.action || 'Activity') as VisitAction,
          timestamp: l.timestamp || new Date().toISOString(),
          authorizedBy: l.authorizedBy || 'System'
        })));
      }

    } catch (error: any) {
      console.error('Context Sync Fault:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
      api.get<any>('/api/profile/me').then(data => {
        const user = normalizeUser(data);
        if (user) {
          setCurrentUser(user);
          setUserRole(user.role);
        }
      }).catch(() => {
        setIsAuthenticated(false);
        api.removeToken();
      }).finally(() => {
        refreshData();
      });
    } else {
      setIsInitialLoading(false);
    }
  }, [refreshData]);

  const login = async (email: string, password?: string) => {
    const response = await api.post<any>('/api/Auth/login', { email, password });
    const token = response.token || response.data?.token || response.accessToken;
    if (token) {
      api.setToken(token);
      const user = normalizeUser(response);
      if (user) { 
        setCurrentUser(user); 
        setUserRole(user.role); 
      }
      setIsAuthenticated(true);
      await refreshData();
    }
  };

  const logout = () => { 
    api.removeToken(); 
    setIsAuthenticated(false); 
    setCurrentUser(null); 
    setUserRole('Staff'); 
  };

  const addBooking = async (payload: any): Promise<Booking> => {
    const res = await api.post<Booking>('/api/bookings', payload);
    await refreshData();
    return res;
  };

  const isRoomAvailable = (roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string): boolean => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return !bookings.some(b => {
      if (b.roomId !== roomId || b.id === excludeBookingId) return false;
      if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.CHECKED_OUT) return false;
      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      return (start < bEnd && end > bStart);
    });
  };

  const value = {
    rooms, bookings, guests, staff, notifications, auditLogs, visitHistory,
    userRole, currentUser, isAuthenticated, isInitialLoading, isSidebarCollapsed, activeTab,
    selectedBookingId, setSelectedBookingId, selectedGuestId, setSelectedGuestId, selectedRoomId, setSelectedRoomId,
    setActiveTab, toggleSidebar: () => setIsSidebarCollapsed(!isSidebarCollapsed), login, logout, setUserRole,
    addRoom: async (r: any) => { await api.post('/api/rooms', r); refreshData(); },
    updateRoom: async (id: any, u: any) => { await api.put(`/api/rooms/${id}`, u); refreshData(); },
    deleteRoom: async (id: any) => { await api.delete(`/api/rooms/${id}`); refreshData(); },
    toggleRoomMaintenance: async (id: any) => { 
      const room = rooms.find(r => r.id === id);
      if (room) {
        await api.put(`/api/rooms/${id}`, { ...room, status: room.status === RoomStatus.MAINTENANCE ? RoomStatus.AVAILABLE : RoomStatus.MAINTENANCE });
        refreshData();
      }
    },
    addBooking,
    updateBooking: async (id: any, u: any) => { await api.put(`/api/bookings/${id}`, u); refreshData(); },
    updatePaymentStatus: async (id: any, s: any) => { await api.put(`/api/bookings/${id}`, { paymentStatus: s }); refreshData(); },
    confirmTransfer: async (c: any) => { await api.post(`/api/bookings/${c}/confirm-transfer`); refreshData(); },
    checkInBooking: async (id: any) => { await api.put(`/api/bookings/${id}/status`, null, { params: { status: 'CheckedIn' } }); refreshData(); },
    checkOutBooking: async (id: any) => { await api.put(`/api/bookings/${id}/status`, null, { params: { status: 'CheckedOut' } }); refreshData(); },
    checkInBookingByCode: async (code: any) => { const b = bookings.find(x => x.bookingCode === code); if (b) await api.put(`/api/bookings/${b.id}/status`, null, { params: { status: 'CheckedIn' } }); refreshData(); },
    cancelBooking: async (id: any) => { await api.put(`/api/bookings/${id}/status`, null, { params: { status: 'Cancelled' } }); refreshData(); },
    addGuest: async (g: any) => { const res = await api.post<any>('/api/Auth/register', g); refreshData(); return res.email; },
    updateGuest: async (id: any, u: any) => { await api.put(`/api/profile/me`, u); refreshData(); },
    isRoomAvailable,
    dismissNotification: (id: any) => setNotifications(n => n.filter(x => x.id !== id)),
    markNotificationAsRead: async (id: any) => { await api.patch(`/api/notifications/${id}/read`); refreshData(); },
    markAllNotificationsRead: async () => { await api.patch(`/api/notifications/read-all`); refreshData(); },
    addStaff: async (s: any) => { await api.post('/api/admin/management/onboard-staff', s); refreshData(); },
    updateStaff: async (id: any, u: any) => { await api.put(`/api/admin/management/employees/${id}`, u); refreshData(); },
    toggleStaffStatus: async (id: any) => { 
      const s = staff.find(x => x.id === id);
      if (s) await api.post(`/api/admin/management/accounts/${id}/${s.status === 'Active' ? 'deactivate' : 'activate'}`);
      refreshData();
    },
    updateCurrentUserProfile: async (u: any) => { await api.put('/api/profile/me', u); refreshData(); },
    refreshData
  };

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
};