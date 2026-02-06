import React, { Suspense, lazy, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import NotificationSystem from "./components/NotificationSystem";
import { HotelProvider, useHotel } from "./store/HotelContext";

// Lazy loading pages
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
const Auth = lazy(() => import("./pages/Auth"));

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    isInitialLoading,
    isSidebarCollapsed,
    activeTab,
    refreshData,
  } = useHotel();

  // Watchdog to prevent permanent splash screen hang if synchronization is slow
  useEffect(() => {
    if (isInitialLoading) {
      const timer = setTimeout(() => {
        // Force refresh data one last time before clearing manually if necessary
        refreshData().catch(() => {});
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, refreshData]);

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
          <h2 className="text-white font-black uppercase tracking-[0.5em] italic text-sm drop-shadow-2xl">
            Moore Systems
          </h2>
          <div className="flex flex-col items-center gap-1">
            <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">
              Synchronizing Security Tokens...
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

  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-slate-600 font-black uppercase tracking-[0.5em] italic text-xs animate-pulse">
              Moore Systems Initializing...
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
      case "dashboard":
        return <Dashboard />;
      case "bookings":
        return <Bookings />;
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
        return <Settlements />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-50 font-sans selection:bg-brand-500/30 overflow-x-hidden">
      <NotificationSystem />
      <Sidebar />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <TopBar />
        <main className="flex-1 fluid-padding overflow-y-auto custom-scrollbar overflow-x-hidden">
          <div className="max-w-[1920px] mx-auto w-full pb-32">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                  <div className="w-14 h-14 border-[3px] border-brand-500/10 border-t-brand-500 rounded-full animate-spin" />
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.3em] italic animate-pulse">
                    Initializing Interface Layer...
                  </p>
                </div>
              }
            >
              {renderContent()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HotelProvider>
      <AppContent />
    </HotelProvider>
  );
};

export default App;