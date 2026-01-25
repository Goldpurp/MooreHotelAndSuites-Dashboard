
import React from 'react';
import { useHotel } from '../store/HotelContext';
import { UserRole } from '../types';

interface PermissionWrapperProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({ children, allowedRoles, fallback = null }) => {
  const { userRole, isAuthenticated } = useHotel();

  // If not authenticated or role is missing, we cannot verify permissions
  if (!isAuthenticated || !userRole) {
    return <>{fallback}</>;
  }

  // Double-check against allowed roles
  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export default PermissionWrapper;
