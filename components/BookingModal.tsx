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
    paymentMethod: 'Paystack', 
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

    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const submissionData = {
        ...formData,
        // Map UI labels to strict backend enum values
        paymentMethod: formData.paymentMethod === 'Bank Transfer' ? 'DirectTransfer' : formData.paymentMethod
      };

      // Wrap in 'request' property as required by backend DTO
      const submissionPayload = { request: submissionData };
      
      const newBooking = await addBooking(submissionPayload);
      setFinalBookingCode(newBooking.bookingCode || 'SUCCESS');
      setStep('success');
    } catch (err: any) {
      setError(`Ledger rejection: ${err.message}`);
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
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl p-10">
               <div className="flex justify-between items-center mb-8">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Dossier Code</span>
                  <span className="text-4xl font-black text-blue-500 tracking-tighter italic">{finalBookingCode}</span>
               </div>
               <div className="flex justify-between pt-6 border-t border-white/5">
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Settlement</span>
                  <span className="text-3xl font-black text-white tracking-tighter">₦{totalAmount.toLocaleString()}</span>
               </div>
            </div>
            <button onClick={onClose} className="mt-12 py-5 px-12 border border-white/10 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-white transition-all">Close Dossier</button>
          </div>
        )}

        {step === 'confirm' && (
           <div className="flex-1 bg-slate-950 p-12 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-4">Verify Dossier</h3>
              <div className="w-full max-w-2xl text-left bg-white/5 p-10 rounded-[2rem] border border-white/5 space-y-6">
                  <div>
                     <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">Occupant</label>
                     <p className="text-2xl font-black text-white italic uppercase tracking-tighter">{formData.guestFirstName} {formData.guestLastName}</p>
                  </div>
                  <div className="flex justify-between pt-6 border-t border-white/5">
                     <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Total Value</span>
                     <span className="text-3xl font-black text-blue-500 tracking-tighter italic">₦{totalAmount.toLocaleString()}</span>
                  </div>
              </div>
              <div className="flex gap-4 w-full max-w-md mt-10">
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
                     <span className="text-3xl font-black text-white tracking-tighter italic">₦{totalAmount.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 bg-slate-950 p-12 flex flex-col overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-8">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Enrollment Protocol</span>
                  <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-slate-600 transition-all"><X size={24}/></button>
               </div>

               <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input placeholder="First Name" value={formData.guestFirstName} onChange={e => setFormData({...formData, guestFirstName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none" />
                    <input placeholder="Last Name" value={formData.guestLastName} onChange={e => setFormData({...formData, guestLastName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none" />
                    <input placeholder="Email" value={formData.guestEmail} onChange={e => setFormData({...formData, guestEmail: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none" />
                    <input placeholder="Phone" value={formData.guestPhone} onChange={e => setFormData({...formData, guestPhone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <input type="date" value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none" />
                     <input type="date" value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none" />
                     <select 
                        value={formData.paymentMethod} 
                        onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-blue-400 font-black uppercase outline-none appearance-none"
                      >
                        <option value="Paystack">Paystack</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {availableRooms.map(room => (
                      <button key={room.id} onClick={() => setFormData({...formData, roomId: room.id})} className={`p-4 rounded-2xl border transition-all ${formData.roomId === room.id ? 'bg-blue-600 border-blue-500 text-white shadow-xl' : 'bg-white/5 border-white/5 text-slate-600'}`}>
                         <p className="text-[14px] font-black leading-tight">{room.roomNumber}</p>
                      </button>
                    ))}
                  </div>

                  {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-black uppercase tracking-tight flex items-center gap-3"><AlertCircle size={18}/> {error}</div>}

                  <button 
                    onClick={validateAndShowConfirm} 
                    disabled={!formData.roomId}
                    className="w-full py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] bg-blue-600 text-white shadow-2xl active:scale-95 transition-all"
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