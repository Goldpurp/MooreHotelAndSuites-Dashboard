import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Zap, FileCheck, Printer, Check, AlertCircle, Loader2, User, Bed, Info } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { RoomStatus } from '../types';

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
  const { rooms, addBooking, isRoomAvailable } = useHotel();
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalBookingCode, setFinalBookingCode] = useState('');
  
  const [formData, setFormData] = useState({
    roomId: '',
    guestFirstName: '',
    guestLastName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: isWalkIn ? today : tomorrow,
    checkOut: isWalkIn ? tomorrow : dayAfter,
    paymentMethod: 'DirectTransfer', 
    notes: ''
  });

  const [error, setError] = useState<string | null>(null);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === formData.roomId), [rooms, formData.roomId]);

  const nights = useMemo(() => {
    const d1 = new Date(formData.checkIn);
    const d2 = new Date(formData.checkOut);
    const diff = d2.getTime() - d1.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [formData.checkIn, formData.checkOut]);

  const totalAmount = useMemo(() => (selectedRoom?.pricePerNight || 0) * nights, [selectedRoom, nights]);

  const availableRooms = useMemo(() => {
    return rooms.filter(room => {
      const isFreeForDates = isRoomAvailable(room.id, formData.checkIn, formData.checkOut);
      const isPhysicallyReady = isWalkIn ? room.status === RoomStatus.AVAILABLE : room.status !== RoomStatus.MAINTENANCE;
      return isFreeForDates && isPhysicallyReady;
    });
  }, [rooms, formData.checkIn, formData.checkOut, isRoomAvailable, isWalkIn]);

  useEffect(() => {
    if (formData.roomId) {
      const stillAvailable = availableRooms.some(r => r.id === formData.roomId);
      if (!stillAvailable) {
        setFormData(prev => ({ ...prev, roomId: '' }));
      }
    }
  }, [formData.checkIn, formData.checkOut, availableRooms]);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setFinalBookingCode('');
      setFormData({
        roomId: '',
        guestFirstName: initialData?.guestFirstName || '',
        guestLastName: initialData?.guestLastName || '',
        guestEmail: initialData?.guestEmail || '',
        guestPhone: initialData?.guestPhone || '',
        checkIn: isWalkIn ? today : tomorrow,
        checkOut: isWalkIn ? tomorrow : dayAfter,
        paymentMethod: 'Paystack',
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

    if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
      setError("Check-out date must follow Check-in.");
      return;
    }

    if (!formData.roomId) {
      setError("Asset allocation is required.");
      return;
    }

    const isActuallyAvailable = availableRooms.some(r => r.id === formData.roomId);
    if (!isActuallyAvailable) {
      setError("Selected asset is no longer available for this date range.");
      setFormData(prev => ({ ...prev, roomId: '' }));
      return;
    }

    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Backend expects PascalCase enum "DirectTransfer" and the data wrapped in a "request" field
      const submissionPayload = {
        request: {
          ...formData,
          paymentMethod: formData.paymentMethod === 'Bank Transfer' ? 'DirectTransfer' : formData.paymentMethod
        }
      };
      
      const newBooking = await addBooking(submissionPayload);
      setFinalBookingCode(newBooking.bookingCode || 'SUCCESS');
      setStep('success');
    } catch (err: any) {
      setError(`Ledger update rejected: ${err.message}`);
      setStep('details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto">
      <div className="glass-card w-full max-w-5xl rounded-[2.5rem] shadow-3xl border border-white/10 flex flex-col md:flex-row min-h-[600px] overflow-hidden">
        
        {step === 'success' && (
          <div className="flex-1 bg-slate-950 p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-8 border border-emerald-500/30">
              <Check size={48} className="text-emerald-500" />
            </div>
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tight mb-4">Folio Synchronized</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px] mb-12">Asset committed to property ledger.</p>

            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
               <div className="p-10 border-b border-white/5 bg-slate-900/60">
                  <div className="flex justify-between items-center mb-8">
                     <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Dossier Code</span>
                     <span className="text-4xl font-black text-blue-500 tracking-tighter italic">{finalBookingCode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Asset Unit</span>
                     <span className="text-[13px] font-black text-white uppercase">Room {selectedRoom?.roomNumber}</span>
                  </div>
               </div>
               <div className="p-10 space-y-5 text-left">
                  <div className="flex justify-between">
                     <span className="text-[10px] text-slate-500 font-black uppercase">Occupant</span>
                     <span className="text-[12px] font-black text-slate-200 uppercase">{formData.guestFirstName} {formData.guestLastName}</span>
                  </div>
                  <div className="flex justify-between pt-6 border-t border-white/5">
                     <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Settlement</span>
                     <span className="text-3xl font-black text-white tracking-tighter">₦{totalAmount.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <div className="flex gap-4 mt-12 w-full max-w-md">
               <button onClick={onClose} className="flex-1 py-5 border border-white/10 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">Close</button>
               <button className="flex-[1.5] py-5 bg-white text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl">
                  <Printer size={18} /> Print Record
               </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
           <div className="flex-1 bg-slate-950 p-12 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-4">Verify Dossier</h3>
              <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 text-left bg-white/5 p-10 rounded-[2rem] border border-white/5">
                 <div className="space-y-8">
                    <div>
                       <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">Occupant</label>
                       <p className="text-2xl font-black text-white italic uppercase tracking-tighter">{formData.guestFirstName} {formData.guestLastName}</p>
                    </div>
                    <div>
                       <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">Asset</label>
                       <p className="text-xl font-black text-slate-200 uppercase">Room {selectedRoom?.roomNumber}</p>
                    </div>
                 </div>
                 <div className="space-y-8 md:text-right">
                    <div>
                       <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">Duration</label>
                       <p className="text-2xl font-black text-white">{nights} Night(s)</p>
                    </div>
                    <div>
                       <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">Settlement Value</label>
                       <p className="text-4xl font-black text-blue-500 tracking-tighter italic">₦{totalAmount.toLocaleString()}</p>
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 w-full max-w-md">
                <button onClick={() => setStep('details')} className="flex-1 py-5 border border-white/10 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">Back</button>
                <button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3">
                   {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <FileCheck size={18} />}
                   Commit to Ledger
                </button>
              </div>
           </div>
        )}

        {step === 'details' && (
          <>
            <div className={`hidden lg:flex lg:w-80 bg-gradient-to-br p-12 flex-col justify-between shrink-0 ${isWalkIn ? 'from-amber-600 to-orange-800' : 'from-blue-600 to-indigo-800'}`}>
               <div className="space-y-12">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-2xl backdrop-blur-md">
                    {isWalkIn ? <Zap size={32}/> : <Calendar size={32}/>}
                  </div>
                  <h2 className="text-5xl font-black text-white uppercase italic leading-[0.85] tracking-tighter">
                    {isWalkIn ? 'FRONT\nDESK\nWALK-IN' : 'NEW\nFOLIO\nRESERVE'}
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

            <div className="flex-1 bg-slate-950 p-12 flex flex-col">
               <div className="flex justify-between items-center mb-12">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Enrollment Protocol</span>
                  <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-slate-600 transition-all"><X size={24}/></button>
               </div>

               <div className="flex-1 space-y-10">
                  <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2"><User size={14} /> Occupant Identity</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input placeholder="First Name" value={formData.guestFirstName} onChange={e => setFormData({...formData, guestFirstName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                        <input placeholder="Last Name" value={formData.guestLastName} onChange={e => setFormData({...formData, guestLastName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                        <input placeholder="Email Address" value={formData.guestEmail} onChange={e => setFormData({...formData, guestEmail: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                        <input placeholder="Phone" value={formData.guestPhone} onChange={e => setFormData({...formData, guestPhone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-In</label>
                        <input type="date" min={today} readOnly={isWalkIn} value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check-Out</label>
                        <input type="date" min={formData.checkIn} value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol</label>
                        <select 
                          value={formData.paymentMethod} 
                          onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-blue-400 font-black uppercase tracking-widest outline-none appearance-none"
                        >
                          <option value="Paystack">Paystack</option>
                          <option value="DirectTransfer">Bank Transfer</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Bed size={14} /> Asset Allocation</h4>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-dash italic">{availableRooms.length} Units Available for these dates</span>
                     </div>
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 overflow-y-auto max-h-40 custom-scrollbar pr-2 p-1">
                        {availableRooms.map(room => (
                          <button key={room.id} onClick={() => setFormData({...formData, roomId: room.id})} className={`p-4 rounded-2xl border text-center transition-all ${formData.roomId === room.id ? 'bg-blue-600 border-blue-500 text-white shadow-xl scale-105' : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/20 hover:bg-white/[0.07]'}`}>
                             <p className="text-[14px] font-black leading-tight">Room {room.roomNumber}</p>
                             <p className="text-[8px] font-bold uppercase mt-1 opacity-60">₦{(room.pricePerNight/1000).toFixed(0)}k</p>
                          </button>
                        ))}
                        {availableRooms.length === 0 && (
                          <div className="col-span-full py-8 text-center bg-rose-500/5 border border-dashed border-rose-500/20 rounded-2xl">
                             <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">No assets available for selected period.</p>
                          </div>
                        )}
                     </div>
                  </div>

                  {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-black uppercase tracking-tight flex items-center gap-3 animate-in shake"><AlertCircle size={18}/> {error}</div>}

                  <button 
                    onClick={validateAndShowConfirm} 
                    disabled={!formData.roomId || availableRooms.length === 0}
                    className={`w-full py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all ${
                      !formData.roomId ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 
                      isWalkIn ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Continue to Verification
                  </button>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;