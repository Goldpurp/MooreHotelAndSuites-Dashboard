
import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Zap, FileCheck, Printer, Check, AlertCircle, Loader2, User, Bed, Info, ShieldCheck, Globe, Clock, Brush } from 'lucide-react';
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
    paymentMethod: PaymentMethod.Paystack, 
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
      // 1. MUST BE ONLINE: Rooms in Maintenance are isOnline: false and blocked.
      if (!room.isOnline) return false;

      // 2. DATE OVERLAP CHECK: Overlapping bookings block selection.
      // This allows walk-ins instantly after checkout as isRoomAvailable ignores 'CheckedOut' dossiers.
      const isFreeForDates = isRoomAvailable(room.id, formData.checkIn, formData.checkOut);
      if (!isFreeForDates) return false;

      // 3. NO OTHER BLOCKS: Per requirement, cleaning or current occupancy does not block reservation creation.
      return true;
    });
  }, [rooms, formData.checkIn, formData.checkOut, isRoomAvailable]);

  useEffect(() => {
    if (formData.roomId) {
      const isValid = availableRooms.some(r => r.id === formData.roomId);
      if (!isValid) {
        setFormData(prev => ({ ...prev, roomId: '' }));
      }
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
        paymentMethod: PaymentMethod.Paystack,
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
      setStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToSettlements = () => {
    setActiveTab('settlements');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
      <div className="w-full max-w-4xl flex flex-col items-center justify-center min-h-[600px]">
        
        {step === 'success' && initResponse && (
          <div className="w-full max-w-lg flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
              <Check size={48} className="text-emerald-500" strokeWidth={4} />
            </div>

            <h2 className="text-[52px] font-black text-white uppercase italic tracking-tight mb-14 leading-none text-center">FOLIO CONFIRMED</h2>

            <div className="w-full bg-[#0a0f1d]/60 border border-white/5 rounded-[2.5rem] p-12 shadow-3xl mb-12 backdrop-blur-md">
               <div className="flex justify-between items-center pb-8 border-b border-white/5">
                  <span className="text-[11px] text-slate-500 font-black uppercase tracking-[0.25em]">DOSSIER CODE</span>
                  <span className="text-[42px] font-black text-brand-500 italic tracking-tighter uppercase leading-none">{initResponse.bookingCode}</span>
               </div>
               
               <div className="flex justify-between items-center pt-8">
                  <span className="text-[11px] text-emerald-500 font-black uppercase tracking-[0.25em]">SETTLEMENT</span>
                  <span className="text-[48px] font-black text-white tracking-tighter italic leading-none">₦{initResponse.amount.toLocaleString()}</span>
               </div>
            </div>

            <div className="w-full space-y-4">
               <button 
                onClick={handleNavigateToSettlements}
                className="w-full py-7 bg-brand-600 hover:bg-brand-700 text-white rounded-[1.5rem] font-black text-[15px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all shadow-brand-500/10"
               >
                 <ShieldCheck size={22} />
                 VERIFY SETTLEMENT NOW
               </button>
               
               <button 
                onClick={onClose}
                className="w-full py-7 bg-[#05080f] hover:bg-[#0a0f1d] text-slate-500 hover:text-white rounded-[1.5rem] font-black text-[15px] uppercase tracking-[0.2em] border border-white/5 transition-all"
               >
                 CLOSE DOSSIER
               </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
           <div className="w-full max-w-2xl bg-[#0a0f1d] border border-white/5 rounded-[3rem] p-12 flex flex-col items-center animate-in fade-in duration-300">
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-10 text-center">Verify Authorization</h3>
              
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 text-left mb-12 bg-white/5 p-10 rounded-[2rem]">
                 <div className="space-y-6">
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1">Occupant</label>
                       <p className="text-2xl font-black text-white italic uppercase tracking-tighter">{formData.guestFirstName} {formData.guestLastName}</p>
                    </div>
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1">Asset</label>
                       <p className="text-xl font-black text-slate-400 uppercase">Room {selectedRoom?.roomNumber}</p>
                    </div>
                 </div>
                 <div className="space-y-6 md:text-right">
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1">Duration</label>
                       <p className="text-2xl font-black text-white">{nights} Night(s)</p>
                    </div>
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1">Settlement</label>
                       <p className="text-4xl font-black text-brand-500 tracking-tighter italic">₦{totalAmount.toLocaleString()}</p>
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 w-full">
                <button onClick={() => setStep('details')} className="flex-1 py-5 border border-white/10 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">Back</button>
                <button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-[2] py-5 bg-brand-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                   {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <FileCheck size={18} />}
                   Commit to Ledger
                </button>
              </div>
           </div>
        )}

        {step === 'details' && (
          <div className="w-full flex flex-col md:flex-row glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl">
            <div className={`hidden lg:flex lg:w-80 bg-gradient-to-br p-12 flex-col justify-between shrink-0 ${isWalkIn ? 'from-amber-600 to-orange-800' : 'from-brand-600 to-indigo-800'}`}>
               <div className="space-y-12">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-2xl backdrop-blur-md">
                    {isWalkIn ? <Zap size={32}/> : <Calendar size={32}/>}
                  </div>
                  <h2 className="text-5xl font-black text-white uppercase italic leading-[0.85] tracking-tighter">
                    {isWalkIn ? 'STAFF\nWALK\nIN' : 'NEW\nFOLIO\nSYNC'}
                  </h2>
               </div>

               <div className="bg-black/30 p-8 rounded-[2rem] border border-white/15 space-y-6 backdrop-blur-md">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Nights</span>
                     <span className="text-lg text-white font-black">{nights}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-6">
                     <div>
                       <span className="text-[10px] text-white/50 font-black uppercase tracking-widest block mb-1">Total Value</span>
                       <span className="text-3xl font-black text-white tracking-tighter italic">₦{totalAmount.toLocaleString()}</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 bg-[#05080f] p-12 flex flex-col">
               <div className="flex justify-between items-center mb-12">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Manual Enrollment Protocol</span>
                  <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-slate-600 transition-all"><X size={24}/></button>
               </div>

               <div className="flex-1 space-y-10">
                  <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2"><User size={14} /> Identity Enrollment</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input placeholder="First Name" value={formData.guestFirstName} onChange={e => setFormData({...formData, guestFirstName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                        <input placeholder="Last Name" value={formData.guestLastName} onChange={e => setFormData({...formData, guestLastName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                        <input placeholder="Email Address" value={formData.guestEmail} onChange={e => setFormData({...formData, guestEmail: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                        <input placeholder="Phone" value={formData.guestPhone} onChange={e => setFormData({...formData, guestPhone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-In</label>
                          <span className="text-[8px] text-blue-500 font-black uppercase flex items-center gap-1"><Clock size={8}/> 15:00</span>
                        </div>
                        <input type="date" min={today} readOnly={isWalkIn} value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-Out</label>
                          <span className="text-[8px] text-rose-500 font-black uppercase flex items-center gap-1"><Clock size={8}/> 11:30</span>
                        </div>
                        <input type="date" min={formData.checkIn} value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol</label>
                        <select 
                          value={formData.paymentMethod} 
                          onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-brand-400 font-black uppercase tracking-widest outline-none appearance-none"
                        >
                          <option value={PaymentMethod.Paystack}>Paystack</option>
                          <option value={PaymentMethod.DirectTransfer}>Bank Transfer</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Bed size={14} /> Asset Allocation</h4>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-dash italic">{availableRooms.length} Units Available</span>
                     </div>
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 overflow-y-auto max-h-40 custom-scrollbar pr-2 p-1">
                        {availableRooms.map(room => (
                          <button 
                            type="button" 
                            key={room.id} 
                            onClick={() => setFormData({...formData, roomId: room.id})} 
                            className={`p-4 rounded-2xl border text-center transition-all relative overflow-hidden ${
                              formData.roomId === room.id 
                                ? 'bg-brand-600 border-brand-500 text-white shadow-xl scale-105' 
                                : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/20 hover:bg-white/[0.07]'
                            }`}
                          >
                             {room.isOnline && (
                               <div className="absolute top-1 right-1">
                                 <Globe size={8} className="text-emerald-500 animate-pulse" />
                               </div>
                             )}
                             {room.status === RoomStatus.Cleaning && (
                               <div className="absolute bottom-1 left-1">
                                 <Brush size={8} className="text-amber-500" />
                               </div>
                             )}
                             <p className="text-[14px] font-black leading-tight">Room {room.roomNumber}</p>
                             <p className={`text-[8px] font-bold uppercase mt-1 ${room.status === RoomStatus.Cleaning ? 'text-amber-500' : 'opacity-60'}`}>
                                {room.status === RoomStatus.Cleaning ? 'Cleaning' : `₦${(room.pricePerNight/1000).toFixed(0)}k`}
                             </p>
                          </button>
                        ))}
                     </div>
                  </div>

                  {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-black uppercase tracking-tight flex items-center gap-3 animate-in shake"><AlertCircle size={18}/> {error}</div>}

                  <button 
                    type="button"
                    onClick={validateAndShowConfirm} 
                    disabled={!formData.roomId || availableRooms.length === 0}
                    className={`w-full py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all ${
                      !formData.roomId ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 
                      isWalkIn ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    Proceed to Authorization
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
