import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import MobileNav from "./components/MobileNav";
import { ConfirmationProvider } from "./components/ConfirmationProvider";
import { Toaster, sileo } from "sileo";
import { api } from "./lib/api";
import { HotelProvider, useHotel, normalizeBooking } from "./store/HotelContext";
import { installNotificationSoundUnlock } from "./lib/notificationSound";
import { canOpenTab, firstAllowedTab } from "./lib/access";
import { useStaffRealtime } from "./hooks/useStaffRealtime";
import { HousekeepingProvider, HousekeepingPage, HousekeepingReminder } from "./components/HousekeepingWorkspace";
import PaymentReviewQueue from "./components/PaymentReviewQueue";
import type { Booking } from "./types";
import type { PaymentReviewRebooking } from "./lib/paymentReview";

// Lazy loading pages
const ReservationOperations = lazy(() => import("./pages/ReservationOperations"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AddOns = lazy(() => import("./pages/AddOns"));
const GuestCrm = lazy(() => import("./pages/GuestCrm"));
const ClientAccounts = lazy(() => import("./pages/ClientAccounts"));
const Channels = lazy(() => import("./pages/Channels"));
const RetryJobs = lazy(() => import("./pages/RetryJobs"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Folios = lazy(() => import("./pages/Folios"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const DailyOperations = lazy(() => import("./pages/DailyOperations"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Rooms = lazy(() => import("./pages/Rooms"));
const Guests = lazy(() => import("./pages/Guests"));
const Reports = lazy(() => import("./pages/Reports"));
const OperationLog = lazy(() => import("./pages/OperationLog"));
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const ClientManagement = lazy(() => import("./pages/ClientManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const Settlements = lazy(() => import("./pages/Settlements"));
const PrivacyRequests = lazy(() => import("./pages/PrivacyRequests"));
const Auth = lazy(() => import("./pages/Auth"));
const StaffSetupPassword = lazy(() => import("./pages/StaffSetupPassword"));

const isStaffSetupRoute = () => {
  if (window.location.pathname.replace(/\/+$/, "") === "/setup-password") return true;
  return new URLSearchParams(window.location.hash.slice(1)).get("route") === "setup-password";
};

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    isInitialLoading,
    sessionRecoveryError,
    retrySession,
    isSidebarCollapsed,
    activeTab,
    setActiveTab,
    currentUser,
    refreshData,
    logout,
  } = useHotel();
  const [paymentReviewRequest, setPaymentReviewRequest] = useState<{
    booking: Booking;
    requestId: number;
  } | null>(null);
  const [paymentReviewRebooking, setPaymentReviewRebooking] = useState<PaymentReviewRebooking | null>(null);
  const openPaymentReview = useCallback(async (booking: Booking) => {
    try {
      const fresh = normalizeBooking(await api.get(`/api/bookings/${encodeURIComponent(booking.bookingCode)}`));
      setPaymentReviewRequest((current) => ({ booking: fresh, requestId: (current?.requestId ?? 0) + 1 }));
    } catch (error) {
      sileo.error({ title: 'Review unavailable', description: error instanceof Error ? error.message : 'Refresh and try again.' });
    }
  }, []);
  const choosePaymentReviewReplacement = useCallback((context: PaymentReviewRebooking) => {
    setPaymentReviewRebooking(context);
    setPaymentReviewRequest(null);
    setActiveTab("bookings");
  }, [setActiveTab]);

  const refreshFromRealtime = useCallback(() => {
    void refreshData({ silent: true });
  }, [refreshData]);
  const revokeSession = useCallback(() => logout(), [logout]);
  useStaffRealtime(
    isAuthenticated && canOpenTab(currentUser, "bookings"),
    refreshFromRealtime,
    revokeSession,
  );

  useEffect(() => installNotificationSoundUnlock(), []);

  useEffect(() => {
    if (isAuthenticated && currentUser && !canOpenTab(currentUser, activeTab)) {
      setActiveTab(firstAllowedTab(currentUser));
    }
  }, [activeTab, currentUser, isAuthenticated, setActiveTab]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let disposed = false;
    let syncInProgress = false;

    const syncInBackground = async () => {
      if (
        disposed ||
        syncInProgress ||
        document.visibilityState === "hidden" ||
        !navigator.onLine
      ) {
        return;
      }

      syncInProgress = true;
      try {
        await refreshData({ silent: true });
      } finally {
        syncInProgress = false;
      }
    };

    const interval = window.setInterval(() => {
      void syncInBackground();
    }, 30_000);
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") void syncInBackground();
    };
    const syncWhenOnline = () => void syncInBackground();

    document.addEventListener("visibilitychange", syncWhenVisible);
    window.addEventListener("focus", syncWhenVisible);
    window.addEventListener("online", syncWhenOnline);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.removeEventListener("focus", syncWhenVisible);
      window.removeEventListener("online", syncWhenOnline);
    };
  }, [isAuthenticated, refreshData]);

  if (isInitialLoading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 animate-in fade-in duration-700">
        <div className="relative">
          <div className="w-20 h-20 border-[3px] border-brand-500/10 border-t-brand-500 rounded-full animate-spin shadow-2xl shadow-brand-500/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-brand-500/20 rounded-full blur-xl animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-white font-black uppercase tracking-[0.5em] text-sm drop-shadow-2xl">
            Moore Systems
          </h2>
          <div className="flex flex-col items-center gap-1">
            <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">
              Checking Security...
            </p>
            <div className="w-48 h-[1px] bg-slate-800 relative overflow-hidden mt-2">
              <div className="absolute inset-0 bg-brand-500 w-1/2 animate-[slide_2s_infinite_linear]" />
            </div>
          </div>
        </div>
        <style>{`
          @keyframes slide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  if (sessionRecoveryError) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <section role="alert" className="max-w-md space-y-5 rounded-2xl border border-white/10 p-8">
        <h1 className="text-xl font-bold">Connection interrupted</h1>
        <p>{sessionRecoveryError}</p>
        <p className="text-sm text-slate-400">Your sign-in is saved. Reconnect to verify your staff profile and continue.</p>
        <button type="button" onClick={retrySession} className="rounded-xl bg-brand-600 px-5 py-3 font-bold">Retry connection</button>
      </section>
    </main>;
  }

  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-slate-600 font-black uppercase tracking-[0.5em] text-xs animate-pulse">
              Opening Moore...
            </div>
          </div>
        }
      >
        <Auth />
      </Suspense>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "reservation_operations": return <ReservationOperations />;
      case "pricing": return <Pricing />;
      case "addons": return <AddOns />;
      case "guest_crm": return <GuestCrm />;
      case "client_accounts": return <ClientAccounts />;
      case "channels": return <Channels />;
      case "retry_jobs": return <RetryJobs />;
      case "inventory": return <Inventory />;
      case "folios": return <Folios />;
      case "maintenance": return <Maintenance />;
      case "daily_operations": return <DailyOperations />;
      case "housekeeping":
        return <HousekeepingPage />;
      case "dashboard":
        return <Dashboard />;
      case "bookings":
        return <Bookings
          paymentReviewRebooking={paymentReviewRebooking}
          onPaymentReviewRebookingClosed={() => setPaymentReviewRebooking(null)}
        />;
      case "rooms":
        return <Rooms />;
      case "guests":
        return <Guests />;
      case "reports":
        return <Reports />;
      case "operation_log":
        return <OperationLog />;
      case "staff":
        return <StaffManagement />;
      case "clients":
        return <ClientManagement />;
      case "settings":
        return <Settings />;
      case "settlements":
        return <Settlements onReviewTransfer={openPaymentReview} />;
      case "privacy":
        return <PrivacyRequests />;
      default:
        return <Dashboard />;
    }
  };

  const usesWorkspaceLayout = new Set([
    "bookings",
    "rooms",
    "guests",
    "operation_log",
    "staff",
    "clients",
    "settlements",
    "privacy",
  ]).has(activeTab);

  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden bg-slate-950 flex text-slate-50 font-sans selection:bg-brand-500/30">
      <Toaster />
      <Sidebar />
      <MobileNav />
      <HousekeepingReminder />


      <div
        className={`h-full min-h-0 flex-1 flex flex-col min-w-0 transition-[margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <TopBar />
      <PaymentReviewQueue
        requestedBooking={paymentReviewRequest?.booking}
        requestId={paymentReviewRequest?.requestId}
        onChooseReplacement={choosePaymentReviewReplacement}
        onOpenSettlements={() => setActiveTab("settlements")}
      />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div
            className={`app-scroll-region fluid-padding mx-auto h-full w-full max-w-[1920px] ${
              usesWorkspaceLayout
                ? "workspace-viewport overflow-hidden"
                : "overflow-y-auto overflow-x-hidden pb-28 md:pb-10"
            }`}
          >
            <div
              key={activeTab}
              className={`route-stage w-full ${usesWorkspaceLayout ? "h-full min-h-0" : "min-h-full"}`}
            >
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                  <div className="w-14 h-14 border-[3px] border-brand-500/10 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] animate-pulse">
                    Loading...
                  </p>
                </div>
              }
            >
              {renderContent()}
            </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  if (isStaffSetupRoute()) {
    return (
      <Suspense fallback={<div className="grid min-h-[100dvh] place-items-center bg-slate-950 text-slate-400">Opening secure setup...</div>}>
        <StaffSetupPassword />
      </Suspense>
    );
  }

  return (
    <HotelProvider>
      <ConfirmationProvider>
        <HousekeepingProvider>
        <AppContent />
        </HousekeepingProvider>
      </ConfirmationProvider>
    </HotelProvider>
  );
};

export default App;
