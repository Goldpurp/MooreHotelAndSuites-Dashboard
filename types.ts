
export enum RoomStatus {
  Available = 'Available',
  Occupied = 'Occupied',
  Cleaning = 'Cleaning',
  Maintenance = 'Maintenance',
  Reserved = 'Reserved'
}

export enum BookingStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  CheckedIn = 'CheckedIn',
  CheckedOut = 'CheckedOut',
  Cancelled = 'Cancelled',
  Reserved = 'Reserved'
}

export enum VisitAction {
  RESERVATION = 'Reservation Made',
  CHECK_IN = 'Checked In',
  CHECK_OUT = 'Checked Out',
  VOID = 'Dossier Voided'
}

export type RoomCategory = 'Standard' | 'Business' | 'Executive' | 'Suite';

export enum PropertyFloor {
  GroundFloor = 'GroundFloor',
  FirstFloor = 'FirstFloor',
  SecondFloor = 'SecondFloor',
  ThirdFloor = 'ThirdFloor',
  Penthouse = 'Penthouse'
}

export enum PaymentStatus {
  Paid = 'Paid',
  Unpaid = 'Unpaid',
  Partial = 'Partial',
  AwaitingVerification = 'AwaitingVerification'
}

export enum PaymentMethod {
  Paystack = 'Paystack',
  DirectTransfer = 'DirectTransfer'
}

export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Staff = 'Staff',
  Client = 'Client'
}

export enum ProfileStatus {
  Active = 'Active',
  Suspended = 'Suspended'
}

export interface BookingStatusHistory {
  status: BookingStatus;
  timestamp: string;
}

export interface BookingInitResponse {
  bookingCode: string;
  paymentUrl: string | null;
  paymentInstruction: string | null;
  amount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
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
  transactionReference?: string;
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

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface StaffUser extends AppUser {
  status: ProfileStatus;
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
