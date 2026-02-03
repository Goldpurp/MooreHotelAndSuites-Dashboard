export enum RoomStatus {
  AVAILABLE = 'Available',
  OCCUPIED = 'Occupied',
  CLEANING = 'Cleaning',
  MAINTENANCE = 'Maintenance',
  RESERVED = 'Reserved'
}

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CHECKED_IN = 'CheckedIn',
  CHECKED_OUT = 'CheckedOut',
  CANCELLED = 'Cancelled'
}

export enum VisitAction {
  RESERVATION = 'Reservation Made',
  CHECK_IN = 'Checked In',
  CHECK_OUT = 'Checked Out',
  VOID = 'Dossier Voided'
}

export type RoomCategory = 'Standard' | 'Business' | 'Executive' | 'Suite';
export type PropertyFloor = 'GroundFloor' | 'FirstFloor' | 'SecondFloor' | 'ThirdFloor' | 'Penthouse';

export enum PaymentStatus {
  PAID = 'Paid',
  UNPAID = 'Unpaid',
  PARTIAL = 'Partial',
  AWAITING_VERIFICATION = 'AwaitingVerification'
}

export interface BookingStatusHistory {
  status: BookingStatus;
  timestamp: string;
}

export interface RoomImage {
  id: string;
  roomId: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  category: RoomCategory;
  floor: PropertyFloor;
  status: RoomStatus;
  pricePerNight: number; 
  capacity: number;
  size: string;
  description: string;
  amenities: string[];
  images: string[];
  isOnline?: boolean;
  createdAt?: string;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  totalStays: number;
  totalSpent: number; 
  avatarUrl?: string;
  isVIP?: boolean;
}

export interface VisitRecord {
  id: string;
  guestId: string;
  guestName: string;
  roomId: string;
  roomNumber: string;
  bookingCode: string;
  action: VisitAction;
  timestamp: string;
  authorizedBy: string;
}

export interface Booking {
  id: string; 
  bookingCode: string; 
  roomId: string;
  guestId?: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string; 
  checkOut: string; 
  status: BookingStatus;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentUrl?: string;
  paymentInstruction?: string;
  createdAt: string;
  notes?: string;
  statusHistory: BookingStatusHistory[];
}

export interface AuditLog {
  id: string;
  profileId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  createdAt: string;
}

export type UserRole = 'Admin' | 'Manager' | 'Staff' | 'Client';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface StaffUser extends AppUser {
  status: 'Active' | 'Suspended';
  createdAt: string;
  password?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  bookingCode?: string;
  isRead: boolean;
  createdAt: string;
}

export interface HotelStats {
  totalRevenue: number;
  occupancyRate: number;
  pendingCheckIns: number;
  avgDailyRate: number;
  revenueGrowth: number;
  occupancyGrowth: number;
}