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
  const [userRole, setUserRole] = useState<UserRole>('staff');
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const normalizeUser = (raw: any): AppUser | null => {
    if (!raw) return null;
    const data = raw.user || raw.profile || raw.data || raw;
    if (!data.id && !data.Id && !data.email && !data.Email) return null;

    return {
      id: String(data.id || data.Id || "").toLowerCase(),
      name: data.name || data.fullName || data.displayName || data.Name || "Personnel",
      email: data.email || data.Email || "",
      role: (String(data.role || data.Role || data.assignedRole || 'staff').toLowerCase() as UserRole),
      avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.fullName || 'P')}&background=020617&color=fff`
    };
  };

  const refreshData = useCallback(async () => {
    if (!api.getToken()) return;

    try {
      const [roomsData, bookingsData, guestsData, staffData, notificationsData, auditLogsData] = await Promise.all([
        api.get<any[]>('/api/rooms').catch(() => []),
        api.get<any[]>('/api/bookings').catch(() => []),
        api.get<any[]>('/api/admin/management/clients').catch(() => []),
        api.get<any[]>('/api/admin/management/employees').catch(() => []),
        api.get<AppNotification[]>('/api/notifications/staff').catch(() => []),
        api.get<any[]>('/api/audit-logs').catch(() => []),
      ]);

      setRooms(roomsData || []);
      setBookings(bookingsData || []);
      setGuests(guestsData || []);
      setStaff(staffData || []);
      setNotifications(notificationsData || []);
      setAuditLogs(auditLogsData || []);
    } catch (error: any) {
      console.error('Failed to sync property ledger', error);
      // If we got an unauthorized error during refresh, log out
      if (error.message.includes('Authorization Required') || error.message.includes('expired')) {
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
    
    const token = 
      response.token || 
      response.data?.token || 
      response.accessToken || 
      response.data?.accessToken ||
      (typeof response === 'string' ? response : null);
    
    if (token) {
      api.setToken(token);
      
      const userFromRes = normalizeUser(response);
      if (userFromRes) {
        setCurrentUser(userFromRes);
        setUserRole(userFromRes.role);
      }
      
      setIsAuthenticated(true);
      await refreshData();
    } else {
      throw new Error("MHS Node Protocol Error: Login succeeded but no bearer token was returned.");
    }
  };

  const logout = () => {
    api.removeToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserRole('staff');
  };

  const addRoom = async (room: Omit<Room, 'id'>) => {
    await api.post('/api/rooms', room);
    await refreshData();
  };

  const updateRoom = async (id: string, updates: Partial<Room>) => {
    await api.put(`/api/rooms/${id}`, updates);
    await refreshData();
  };

  const deleteRoom = async (id: string) => {
    await api.delete(`/api/rooms/${id}`);
    await refreshData();
  };

  const toggleRoomMaintenance = async (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room) {
      const newStatus = room.status === RoomStatus.MAINTENANCE ? RoomStatus.AVAILABLE : RoomStatus.MAINTENANCE;
      await updateRoom(id, { status: newStatus });
    }
  };

  const addBooking = async (p: any): Promise<Booking> => {
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
    const newBooking = await api.post<Booking>('/api/bookings', payload);
    await refreshData();
    return newBooking;
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    await api.put(`/api/bookings/${id}`, updates);
    await refreshData();
  };

  const updatePaymentStatus = async (id: string, status: PaymentStatus) => {
    await api.put(`/api/bookings/${id}`, { paymentStatus: status });
    await refreshData();
  };

  const confirmTransfer = async (bookingCode: string) => {
    await api.post(`/api/bookings/${bookingCode}/confirm-transfer`);
    await refreshData();
  };

  const checkInBooking = async (bookingId: string) => {
    await api.put(`/api/bookings/${bookingId}/status`, null, { params: { status: 'CheckedIn' } });
    await refreshData();
  };

  const checkOutBooking = async (bookingId: string) => {
    await api.put(`/api/bookings/${bookingId}/status`, null, { params: { status: 'CheckedOut' } });
    await refreshData();
  };

  const checkInBookingByCode = async (code: string) => {
    const booking = bookings.find(b => b.bookingCode === code);
    if (booking) await checkInBooking(booking.id);
  };

  const cancelBooking = async (bookingId: string) => {
    await api.put(`/api/bookings/${bookingId}/status`, null, { params: { status: 'Cancelled' } });
    await refreshData();
  };

  const addGuest = async (guest: Omit<Guest, 'id' | 'totalStays' | 'totalSpent'>): Promise<string> => {
    const newGuest = await api.post<any>('/api/Auth/register', guest);
    await refreshData();
    return newGuest.email;
  };

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    await api.put(`/api/profile/me`, updates);
    await refreshData();
  };

  const isRoomAvailable = (roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string): boolean => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    return !bookings.some(b => {
      if (b.roomId !== roomId) return false;
      if (b.id === excludeBookingId) return false;
      if (b.status === BookingStatus.CANCELLED) return false;
      
      const bIn = new Date(b.checkIn);
      const bOut = new Date(b.checkOut);
      
      return (checkInDate < bOut && checkOutDate > bIn);
    });
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markNotificationAsRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => api.patch(`/api/notifications/${n.id}/read`)));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const addStaff = async (p: any) => {
    await api.post('/api/admin/management/onboard-staff', {
      fullName: p.name, 
      email: p.email, 
      temporaryPassword: p.password, 
      assignedRole: p.role.charAt(0).toUpperCase() + p.role.slice(1), 
      status: p.status || 'Active'
    }); 
    await refreshData();
  };

  const updateStaff = async (id: string, updates: Partial<StaffUser>) => {
    await api.put(`/api/admin/management/employees/${id}`, {
      fullName: updates.name, 
      email: updates.email, 
      assignedRole: updates.role ? updates.role.charAt(0).toUpperCase() + updates.role.slice(1) : undefined, 
      status: updates.status
    }); 
    await refreshData();
  };

  const toggleStaffStatus = async (id: string) => {
    const target = staff.find(s => s.id === id);
    if (target) {
      const action = target.status === 'Active' ? 'deactivate' : 'activate';
      await api.post(`/api/admin/management/accounts/${id}/${action}`); 
    }
    await refreshData();
  };

  const updateCurrentUserProfile = async (updates: Partial<AppUser>) => {
    await api.put('/api/profile/me', updates);
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  const value = {
    rooms, bookings, guests, staff, notifications, auditLogs, visitHistory,
    userRole, currentUser, isAuthenticated, isInitialLoading, isSidebarCollapsed, activeTab,
    selectedBookingId, setSelectedBookingId, selectedGuestId, setSelectedGuestId, selectedRoomId, setSelectedRoomId,
    setActiveTab, toggleSidebar: () => setIsSidebarCollapsed(!isSidebarCollapsed), login, logout, setUserRole,
    addRoom, updateRoom, deleteRoom, toggleRoomMaintenance,
    addBooking, updateBooking, updatePaymentStatus, confirmTransfer,
    checkInBooking, checkOutBooking, checkInBookingByCode, cancelBooking,
    addGuest, updateGuest, isRoomAvailable,
    dismissNotification, markNotificationAsRead, markAllNotificationsRead,
    addStaff, updateStaff, toggleStaffStatus, updateCurrentUserProfile, refreshData
  };

  return (
    <HotelContext.Provider value={value}>
      {children}
    </HotelContext.Provider>
  );
};