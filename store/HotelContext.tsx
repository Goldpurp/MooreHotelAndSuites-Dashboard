
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

// @fix: Export useHotel hook to resolve "no exported member 'useHotel'" errors in consuming components
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

  // @fix: Implemented normalizeUser to properly map backend user objects to AppUser type
  const normalizeUser = (raw: any): AppUser | null => {
    if (!raw) return null;
    return {
      id: raw.id,
      name: raw.name || raw.displayName,
      email: raw.email,
      role: (raw.role?.toLowerCase() || 'staff') as UserRole,
      avatarUrl: raw.avatarUrl
    };
  };

  const refreshData = useCallback(async () => {
    try {
      const [roomsData, bookingsData, guestsData, staffData, notificationsData, auditLogsData, visitHistoryData] = await Promise.all([
        api.get<Room[]>('/api/rooms'),
        api.get<Booking[]>('/api/bookings'),
        api.get<Guest[]>('/api/guests'),
        api.get<StaffUser[]>('/api/staff'),
        api.get<AppNotification[]>('/api/notifications'),
        api.get<AuditLog[]>('/api/audit'),
        api.get<VisitRecord[]>('/api/visits'),
      ]);
      setRooms(roomsData);
      setBookings(bookingsData);
      setGuests(guestsData);
      setStaff(staffData);
      setNotifications(notificationsData);
      setAuditLogs(auditLogsData);
      setVisitHistory(visitHistoryData);
    } catch (error) {
      console.error('Failed to fetch hotel data', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      setIsAuthenticated(true);
      api.get<any>('/api/profile').then(data => {
        const user = normalizeUser(data);
        if (user) {
          setCurrentUser(user);
          setUserRole(user.role);
        }
      }).catch(() => {});
      refreshData();
    } else {
      setIsInitialLoading(false);
    }
  }, [refreshData]);

  const login = async (email: string, password?: string) => {
    const response = await api.post<{ token: string, user: any }>('/api/auth/login', { email, password });
    api.setToken(response.token);
    const user = normalizeUser(response.user);
    if (user) {
      setCurrentUser(user);
      setUserRole(user.role);
      setIsAuthenticated(true);
      await refreshData();
    }
  };

  const logout = () => {
    api.removeToken();
    setIsAuthenticated(false);
    setCurrentUser(null);
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

  const addBooking = async (payload: any): Promise<Booking> => {
    const newBooking = await api.post<Booking>('/api/bookings', payload);
    await refreshData();
    return newBooking;
  };

  const updateBooking = async (id: string, updates: Partial<Booking>) => {
    await api.put(`/api/bookings/${id}`, updates);
    await refreshData();
  };

  const updatePaymentStatus = async (id: string, status: PaymentStatus) => {
    await api.patch(`/api/bookings/${id}/payment`, { status });
    await refreshData();
  };

  const confirmTransfer = async (bookingCode: string) => {
    await api.post(`/api/bookings/confirm-transfer/${bookingCode}`);
    await refreshData();
  };

  const checkInBooking = async (bookingId: string) => {
    await api.post(`/api/bookings/${bookingId}/check-in`);
    await refreshData();
  };

  const checkOutBooking = async (bookingId: string) => {
    await api.post(`/api/bookings/${bookingId}/check-out`);
    await refreshData();
  };

  const checkInBookingByCode = async (code: string) => {
    await api.post(`/api/bookings/check-in-by-code/${code}`);
    await refreshData();
  };

  const cancelBooking = async (bookingId: string) => {
    await api.post(`/api/bookings/${bookingId}/cancel`);
    await refreshData();
  };

  const addGuest = async (guest: Omit<Guest, 'id' | 'totalStays' | 'totalSpent'>): Promise<string> => {
    const newGuest = await api.post<Guest>('/api/guests', guest);
    await refreshData();
    return newGuest.id;
  };

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    await api.put(`/api/guests/${id}`, updates);
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
    await api.post(`/api/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsRead = async () => {
    await api.post('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const addStaff = async (user: any) => {
    await api.post('/api/staff', user);
    await refreshData();
  };

  const updateStaff = async (id: string, updates: Partial<StaffUser>) => {
    await api.put(`/api/staff/${id}`, updates);
    await refreshData();
  };

  const toggleStaffStatus = async (id: string) => {
    await api.post(`/api/staff/${id}/toggle-status`);
    await refreshData();
  };

  const updateCurrentUserProfile = async (updates: Partial<AppUser>) => {
    await api.patch('/api/profile', updates);
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

  // @fix: Added mandatory return statement to HotelProvider to resolve the 'Type void is not assignable to type ReactNode' error
  return (
    <HotelContext.Provider value={value}>
      {children}
    </HotelContext.Provider>
  );
};
