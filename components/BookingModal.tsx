import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Zap, FileCheck, Check, AlertCircle, Loader2, User, Bed, ShieldCheck, Globe, Clock, Brush, ChevronRight, Receipt, Wallet } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { RoomStatus, PaymentMethod, BookingInitResponse } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWalkIn?: boolean;
  initialData?: {
    guestFirstName: string;
    guestLastName: string;
    guestEmail: string;
    guestPhone: string;
  } | null;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, isWalkIn = false, initialData = null }) => {
  const { rooms, addBooking, isRoomAvailable, setActiveTab } = useHotel();
  
  const getLocalDateStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const today = getLocalDateStr(0);
  const tomorrow = getLocalDateStr(1);
  const dayAfter = getLocalDateStr(2);

  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initResponse, setInitResponse] = useState<BookingInitResponse | null>(null);
  
  const [formData, setFormData] = useState({
    roomId: '',
    guestFirstName: '',
    guestLastName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: isWalkIn ? today : tomorrow,
    checkOut: isWalkIn ? tomorrow : dayAfter,
    paymentMethod: PaymentMethod.DirectTransfer, 
    notes: ''
  });

  const [error, setError] = useState<string | null>(null);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === formData.roomId), [rooms, formData.roomId]);

  const nights = useMemo(() => {
    const d1 = new Date(formData.checkIn.replace(/-/g, '/'));
    const d2 = new Date(formData.checkOut.replace(/-/g, '/'));
    const diff = d2.getTime() - d1.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [formData.checkIn, formData.checkOut]);

  const totalAmount = useMemo(() => (selectedRoom?.pricePerNight || 0) * nights, [selectedRoom, nights]);

  const availableRooms = useMemo(() => {
    return rooms.filter(room => {
      if (!room.isOnline) return false;
      const isFreeForDates = isRoomAvailable(room.id, formData.checkIn, formData.checkOut);
      if (!isFreeForDates) return false;
      return true;
    });
  }, [rooms, formData.checkIn, formData.checkOut, isRoomAvailable]);

  useEffect(() => {
    if (formData.roomId) {
      const isValid = availableRooms.some(r => r.id === formData.roomId);
      if (!isValid) setFormData(prev => ({ ...prev, roomId: '' }));
    }
  }, [availableRooms, formData.roomId]);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setInitResponse(null);
      setFormData({
        roomId: '',
        guestFirstName: initialData?.guestFirstName || '',
        guestLastName: initialData?.guestLastName || '',
        guestEmail: initialData?.guestEmail || '',
        guestPhone: initialData?.guestPhone || '',
        checkIn: isWalkIn ? today : tomorrow,
        checkOut: isWalkIn ? tomorrow : dayAfter,
        paymentMethod: PaymentMethod.DirectTransfer,
        notes: ''
      });
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, isWalkIn, initialData, today, tomorrow, dayAfter]);

  if (!isOpen) return null;

  const validateAndShowConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.guestFirstName || !formData.guestLastName || !formData.guestEmail) {
      setError("Occupant identity enrollment is incomplete.");
      return;
    }
    if (new Date(formData.checkOut.replace(/-/g, '/')) <= new Date(formData.checkIn.replace(/-/g, '/'))) {
      setError("Check-out date must follow Check-in.");
      return;
    }
    if (!formData.roomId) {
      setError("Asset allocation is required.");
      return;
    }
    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await addBooking(formData);
      if (response.bookingCode) {
        setInitResponse(response);
        setStep('success');
      } else {
        throw new Error("Protocol failure: No dossier code received from node.");
      }
    } catch (err: any) {
      setError(`Ledger rejection: ${err.message}`);
      // Don't reset step so they can try again or go back
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToSettlements = () => {
    setActiveTab('settlements');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-[#020617]/98 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-5xl flex flex-col items-center justify-center min-h-[500px] py-4 sm:py-8">
        
        {step === 'success' && initResponse && (
          <div className="w-full max-w-2xl flex flex-col items-center animate-in zoom-in-95 duration-500 p-4 sm:p-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 sm:mb-10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
              <Check className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-500" strokeWidth={4} />
            </div>

            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-4">Folio Verified</h2>
              <p className="text-[10px] sm:text-[12px] text-emerald-400 font-black uppercase tracking-[0.4em]">System Commitment Synchronized</p>
            </div>

            <div className="w-full bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-14 shadow-3xl mb-8 sm:mb-14 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Receipt size={120} className="text-white" />
               </div>
               
               <div className="space-y-10 relative z-10">
                 <div className="flex flex-col sm:flex-row justify-between items-center pb-8 border-b border-white/5 gap-4">
                    <div className="text-center sm:text-left">
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] block mb-2">Dossier Reference</span>
                       <span className="text-4xl sm:text-[64px] font-black text-white tracking-tighter uppercase leading-none">{initResponse.bookingCode}</span>
                    </div>
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                       <span className="text-[10px] text-emerald-400 font-black uppercase">Status: Live</span>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] block mb-1">Accounting</span>
                       <span className="text-2xl sm:text-[42px] font-black text-brand-500 tracking-tighter leading-none">₦{initResponse.amount.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.25em] block mb-1">Asset Unit</span>
                       <span className="text-2xl sm:text-3xl font-black text-white uppercase leading-none">Room {selectedRoom?.roomNumber}</span>
                    </div>
                 </div>
               </div>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button onClick={handleNavigateToSettlements} className="w-full py-5 sm:py-7 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-[15px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all">
                 <ShieldCheck size={20} /> Verify Settlement
               </button>
               <button onClick={onClose} className="w-full py-5 sm:py-7 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl sm:rounded-[1.5rem] font-black text-xs sm:text-[15px] uppercase tracking-[0.2em] border border-white/5 transition-all">
                 Close Protocol
               </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
           <div className="w-full max-w-3xl bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-16 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 shadow-3xl">
              <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-8 border border-brand-500/20">
                 <FileCheck size={32} className="text-brand-500" />
              </div>
              
              <div className="text-center mb-12">
                <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-3 leading-none">Authorization Required</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em]">Verify Folio Intent Before Ledger Commitment</p>
              </div>
              
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-1 bg-white/5 border border-white/10 rounded-3xl overflow-hidden mb-12 shadow-inner">
                 <div className="p-8 sm:p-10 space-y-8 bg-black/20">
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Primary Occupant</label>
                       <p className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{formData.guestFirstName} {formData.guestLastName}</p>
                       <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{formData.guestEmail}</p>
                    </div>
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Room Allocation</label>
                       <div className="flex items-center gap-3">
                          <Bed size={18} className="text-brand-400" />
                          <p className="text-xl font-black text-slate-300 uppercase">Room {selectedRoom?.roomNumber}</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-8 sm:p-10 space-y-8 bg-black/40">
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Stay Metric</label>
                       <p className="text-2xl font-black text-white">{nights} Night(s)</p>
                       <p className="text-[11px] text-slate-500 font-medium mt-1">{new Date(formData.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — {new Date(formData.checkOut).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Financial Commitment</label>
                       <p className="text-4xl font-black text-emerald-500 tracking-tighter leading-none">₦{totalAmount.toLocaleString()}</p>
                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-2 flex items-center gap-2"><Wallet size={10} /> {formData.paymentMethod}</p>
                    </div>
                 </div>
              </div>

              {error && (
                <div className="w-full p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-black uppercase tracking-tight flex items-center gap-4 mb-8 animate-in shake">
                  <AlertCircle size={20}/> 
                  <div>
                    <p className="font-black">Ledger Rejection</p>
                    <p className="opacity-80 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button onClick={() => setStep('details')} disabled={isSubmitting} className="flex-1 py-5 border border-white/10 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-[0.2em] hover:text-white hover:bg-white/5 transition-all">Abort</button>
                <button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-[2] py-5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                   {isSubmitting ? (
                     <>
                        <Loader2 size={18} className="animate-spin" /> 
                        Synchronizing Protocol...
                     </>
                   ) : (
                     <>
                        <FileCheck size={18} /> Commit to Global Ledger
                     </>
                   )}
                </button>
              </div>
           </div>
        )}

        {step === 'details' && (
          <div className="w-full flex flex-col lg:flex-row glass-card rounded-[1.5rem] sm:rounded-[4rem] overflow-hidden border border-white/10 shadow-3xl max-h-[92vh] sm:max-h-[90vh]">
            {/* Left Visual Sidebar - Responsive Stacking */}
            <div className={`flex lg:w-80 bg-gradient-to-br p-6 sm:p-10 lg:p-12 flex-col justify-between shrink-0 ${isWalkIn ? 'from-amber-600 to-orange-800' : 'from-brand-600 to-indigo-800'}`}>
               <div className="space-y-4 sm:space-y-12">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-2xl backdrop-blur-md">
                    {isWalkIn ? <Zap size={24}/> : <Calendar size={24}/>}
                  </div>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white uppercase leading-[0.85] tracking-tighter">
                    {isWalkIn ? 'STAFF\nWALK\nIN' : 'NEW\nFOLIO\nSYNC'}
                  </h2>
               </div>

               <div className="bg-black/30 p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/15 space-y-4 sm:space-y-8 backdrop-blur-md mt-6 lg:mt-0 shadow-2xl">
                  <div className="flex justify-between items-center">
                     <span className="text-[9px] text-white/50 font-black uppercase tracking-widest">Nights</span>
                     <span className="text-lg sm:text-xl text-white font-black">{nights}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-4 sm:pt-8">
                     <div className="w-full">
                       <span className="text-[9px] text-white/50 font-black uppercase tracking-widest block mb-1">Projected Settlement</span>
                       <span className="text-2xl sm:text-4xl font-black text-white tracking-tighter">₦{totalAmount.toLocaleString()}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Right Form Content - Responsive Padding */}
            <div className="flex-1 bg-[#05080f] p-6 sm:p-10 lg:p-16 flex flex-col overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-8 sm:mb-16">
                  <div className="flex items-center gap-3">
                     <span className="w-8 h-[2px] bg-brand-500 rounded-full"></span>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Manual Enrollment Protocol</span>
                  </div>
                  <button onClick={onClose} className="p-2 sm:p-3 hover:bg-white/5 rounded-xl sm:rounded-2xl text-slate-600 transition-all active:scale-90"><X size={20}/></button>
               </div>

               <div className="flex-1 space-y-8 sm:space-y-14">
                  <div className="space-y-4 sm:space-y-8">
                      <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] flex items-center gap-2 leading-none"><User size={14} /> Identity Enrollment</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                           <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest ml-1">First Name</label>
                           <input placeholder="John" value={formData.guestFirstName} onChange={e => setFormData({...formData, guestFirstName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest ml-1">Last Name</label>
                           <input placeholder="Doe" value={formData.guestLastName} onChange={e => setFormData({...formData, guestLastName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest ml-1">Enterprise Email</label>
                           <input placeholder="john.doe@enterprise.com" value={formData.guestEmail} onChange={e => setFormData({...formData, guestEmail: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest ml-1">Secure Line</label>
                           <input placeholder="+234..." value={formData.guestPhone} onChange={e => setFormData({...formData, guestPhone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold" />
                        </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check In</label>
                          <span className="text-[8px] text-blue-500 font-black uppercase flex items-center gap-1 leading-none"><Clock size={8}/> 15:00</span>
                        </div>
                        <input type="date" min={today} readOnly={isWalkIn} value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold" />
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check Out</label>
                          <span className="text-[8px] text-rose-500 font-black uppercase flex items-center gap-1 leading-none"><Clock size={8}/> 11:30</span>
                        </div>
                        <input type="date" min={formData.checkIn} value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tariff Protocol</label>
                        <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-brand-400 font-black uppercase tracking-widest outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all">
                          <option value={PaymentMethod.DirectTransfer}>Bank Transfer</option>
                          <option value={PaymentMethod.Paystack}>Paystack Gateway</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-4 sm:space-y-8">
                     <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2 leading-none"><Bed size={14} /> Asset Allocation</h4>
                        <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{availableRooms.length} Rooms Online</span>
                     </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 overflow-y-auto max-h-48 sm:max-h-64 custom-scrollbar pr-3 p-1">
                        {availableRooms.map(room => (
                          <button type="button" key={room.id} onClick={() => setFormData({...formData, roomId: room.id})} className={`p-4 sm:p-5 rounded-2xl border text-center transition-all relative overflow-hidden group/room ${formData.roomId === room.id ? 'bg-brand-600 border-brand-500 text-white shadow-xl scale-105' : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/20 hover:bg-white/[0.07]'}`}>
                             {room.isOnline && <div className="absolute top-2 right-2"><Globe size={10} className={`${formData.roomId === room.id ? 'text-white' : 'text-emerald-500'} animate-pulse`} /></div>}
                             <p className="text-[12px] sm:text-[14px] font-black leading-tight uppercase tracking-tighter">Room {room.roomNumber}</p>
                             <p className="text-[8px] font-bold uppercase mt-1 opacity-60">₦{(room.pricePerNight/1000).toFixed(0)}k / night</p>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="pt-6 sm:pt-10 border-t border-white/5">
                     <button type="button" onClick={validateAndShowConfirm} disabled={!formData.roomId || availableRooms.length === 0} className={`w-full py-5 sm:py-7 rounded-2xl sm:rounded-[2rem] font-black text-[11px] sm:text-[13px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${!formData.roomId ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : isWalkIn ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-900/20' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-900/20'}`}>
                        Initialize Authorization Protocol <ChevronRight size={18} strokeWidth={3} />
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;