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
    if (res.value && Array.isArray(res.value)) return res.value; 
    return [];
  };

  const normalizeUser = (raw: any): AppUser | null => {
    if (!raw) return null;
    const data = raw.user || raw.profile || raw.data || raw;
    if (!data.id && !data.Id && !data.email && !data.Email) return null;
    
    let role: UserRole = 'Staff';
    const rawRole = String(data.role || data.Role || 'Staff').toLowerCase();
    
    // Explicit PascalCase mapping to match UserRole type exactly
    if (rawRole === 'admin') role = 'Admin';
    else if (rawRole === 'manager') role = 'Manager';
    else if (rawRole === 'client' || rawRole === 'guest') role = 'Client';
    else if (rawRole === 'staff') role = 'Staff';

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

      const normalizedRooms = normalizeData(roomsRes);
      const normalizedBookings = normalizeData(bookingsRes);
      const normalizedGuests = normalizeData(guestsRes);
      const normalizedAudit = normalizeData(auditLogsRes);
      const normalizedLedger = normalizeData(ledgerRes);
      
      setRooms(normalizedRooms);
      setBookings(normalizedBookings);
      setStaff(normalizeData(staffRes).map(s => normalizeUser(s) as StaffUser).filter(s => s !== null));
      setNotifications(normalizeData(notificationsRes));
      setAuditLogs(normalizedAudit);

      // GUEST RECOVERY
      const guestMap: Map<string, Guest> = new Map();
      normalizedGuests.forEach(g => {
        if (g && g.id) guestMap.set(String(g.id).toLowerCase(), {
          ...g,
          firstName: g.firstName || 'Guest',
          lastName: g.lastName || '',
          email: g.email || '',
          phone: g.phone || ''
        });
      });

      normalizedBookings.forEach(b => {
        const primaryId = String(b.guestId || b.guestEmail || b.bookingCode || '').toLowerCase();
        if (primaryId && !guestMap.has(primaryId)) {
          guestMap.set(primaryId, {
            id: b.guestId || primaryId,
            firstName: b.guestFirstName || 'Resident',
            lastName: b.guestLastName || '',
            email: b.guestEmail || '',
            phone: b.guestPhone || '',
            totalStays: 1,
            totalSpent: b.amount || 0,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(b.guestFirstName || 'R')}+${encodeURIComponent(b.guestLastName || '')}&background=020617&color=fff`
          });
        }
      });
      setGuests(Array.from(guestMap.values()));

      // OPERATIONS LEDGER SYNC (v9.1 Reference)
      if (normalizedLedger && normalizedLedger.length > 0) {
        setVisitHistory(normalizedLedger.map((l: any) => ({
          id: l.id || l.Id || Math.random().toString(),
          guestId: l.guestId || l.GuestId || '',
          guestName: l.guestName || l.guestFirstName || l.GuestName || 'Property Occupant',
          roomId: l.roomId || l.RoomId || '',
          roomNumber: l.roomNumber || l.RoomNumber || 'N/A',
          bookingCode: l.bookingCode || l.BookingCode || 'N/A',
          action: (l.action || l.actionName || 'Activity').toUpperCase().replace('_', ' ') as VisitAction,
          timestamp: l.timestamp || l.createdAt || l.occurredAt || new Date().toISOString(),
          authorizedBy: l.authorizedBy || l.staffName || l.PerformedBy || 'System'
        })));
      }

    } catch (error: any) {
      console.error('Property Synchronization Protocol Failed:', error);
      if (error.message?.includes('Authorization Required')) {
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
    } else {
      throw new Error("Authorization protocol failed: Authentication node returned null.");
    }
  };

  const logout = () => { 
    api.removeToken(); 
    setIsAuthenticated(false); 
    setCurrentUser(null); 
    setUserRole('Staff'); 
  };

  const addRoom = async (room: Omit<Room, 'id'>) => { await api.post('/api/rooms', room); await refreshData(); };
  const updateRoom = async (id: string, updates: Partial<Room>) => { await api.put(`/api/rooms/${id}`, updates); await refreshData(); };
  const deleteRoom = async (id: string) => { await api.delete(`/api/rooms/${id}`); await refreshData(); };
  
  const toggleRoomMaintenance = async (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room) {
      const updatedRoom = { 
        ...room, 
        status: room.status === RoomStatus.MAINTENANCE ? RoomStatus.AVAILABLE : RoomStatus.MAINTENANCE 
      };
      await api.put(`/api/rooms/${id}`, updatedRoom);
      await refreshData();
    }
  };

  const addBooking = async (payload: any): Promise<Booking> => {
    const res = await api.post<any>('/api/bookings', payload);
    await refreshData();
    return res;
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => { await api.put(`/api/bookings/${id}`, updates); await refreshData(); };
  const updatePaymentStatus = async (id: string, status: PaymentStatus) => { await api.put(`/api/bookings/${id}`, { paymentStatus: status }); await refreshData(); };
  const confirmTransfer = async (code: string) => { await api.post(`/api/bookings/${code}/confirm-transfer`); await refreshData(); };
  
  const checkInBooking = async (id: string) => { await api.put(`/api/bookings/${id}/status`, null, { params: { status: 'CheckedIn' } }); await refreshData(); };
  const checkOutBooking = async (id: string) => { await api.put(`/api/bookings/${id}/status`, null, { params: { status: 'CheckedOut' } }); await refreshData(); };
  const cancelBooking = async (id: string) => { await api.put(`/api/bookings/${id}/status`, null, { params: { status: 'Cancelled' } }); await refreshData(); };

  const checkInBookingByCode = async (code: string) => { const b = bookings.find(x => x.bookingCode === code); if (b) await checkInBooking(b.id); };
  const addGuest = async (g: any) => { const res = await api.post<any>('/api/Auth/register', g); await refreshData(); return res.email; };
  const updateGuest = async (id: string, updates: Partial<Guest>) => { await api.put(`/api/profile/me`, updates); await refreshData(); };

  const isRoomAvailable = (roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string): boolean => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return !bookings.some(b => {
      const isCorrectRoom = b.roomId === roomId;
      const isNotExcluded = b.id !== excludeBookingId;
      const isActive = b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.CHECKED_OUT;
      
      if (!isCorrectRoom || !isNotExcluded || !isActive) return false;
      const bStart = new Date(b.checkIn);
      const bEnd = new Date(b.checkOut);
      return (start < bEnd && end > bStart);
    });
  };

  const dismissNotification = (id: string) => { setNotifications(prev => prev.filter(n => n.id !== id)); };
  const markNotificationAsRead = async (id: string) => { await api.patch(`/api/notifications/${id}/read`); setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n)); };
  const markAllNotificationsRead = async () => { await Promise.all(notifications.filter(n => !n.isRead).map(n => api.patch(`/api/notifications/${n.id}/read`))); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); };
  const addStaff = async (p: any) => { await api.post('/api/admin/management/onboard-staff', p); await refreshData(); };
  const updateStaff = async (id: string, updates: Partial<StaffUser>) => { await api.put(`/api/admin/management/employees/${id}`, updates); await refreshData(); };
  const toggleStaffStatus = async (id: string) => { const s = staff.find(x => x.id === id); if (s) await api.post(`/api/admin/management/accounts/${id}/${s.status === 'Active' ? 'deactivate' : 'activate'}`); await refreshData(); };
  const updateCurrentUserProfile = async (updates: Partial<AppUser>) => { await api.put('/api/profile/me', updates); if (currentUser) setCurrentUser({ ...currentUser, ...updates }); };

  const value = {
    rooms, bookings, guests, staff, notifications, auditLogs, visitHistory,
    userRole, currentUser, isAuthenticated, isInitialLoading, isSidebarCollapsed, activeTab,
    selectedBookingId, setSelectedBookingId, selectedGuestId, setSelectedGuestId, selectedRoomId, setSelectedRoomId,
    setActiveTab, toggleSidebar: () => setIsSidebarCollapsed(!isSidebarCollapsed), login, logout, setUserRole,
    addRoom, updateRoom, deleteRoom, toggleRoomMaintenance, addBooking, updateBooking, updatePaymentStatus, confirmTransfer,
    checkInBooking, checkOutBooking, checkInBookingByCode, cancelBooking, addGuest, updateGuest, isRoomAvailable,
    dismissNotification, markNotificationAsRead, markAllNotificationsRead, addStaff, updateStaff, toggleStaffStatus, updateCurrentUserProfile, refreshData
  };

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
};