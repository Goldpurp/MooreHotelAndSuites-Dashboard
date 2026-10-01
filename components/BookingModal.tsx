import React, { useState, useMemo, useEffect } from 'react';
import { parseGuestCounts } from '../utils/guestCounts';
import { X, Calendar, Zap, FileCheck, Check, AlertCircle, Loader2, User, Bed, ShieldCheck, Globe, Clock, ChevronRight, Receipt, Wallet } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { PaymentMethod, PaymentStatus, BookingStatus, BookingInitResponse, PricingQuote, PrivacyPolicy } from '../types';
import { sileo } from 'sileo';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { api } from '../lib/api';
import type { PaymentReviewRebooking } from '../lib/paymentReview';

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
  paymentReviewRebooking?: PaymentReviewRebooking | null;
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  isWalkIn = false,
  initialData = null,
  paymentReviewRebooking = null,
}) => {
  const { rooms, addBooking, isRoomAvailable, setActiveTab, refreshData, guests, selectedGuestId } = useHotel();
  const isPaymentReviewRebooking = Boolean(paymentReviewRebooking);
  
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
  const [pricingQuote, setPricingQuote] = useState<PricingQuote | null>(null);
  const [isPricing, setIsPricing] = useState(false);
  const [replacementRoomIds, setReplacementRoomIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    roomId: '',
    guestId: '',
    guestFirstName: '',
    guestLastName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: isWalkIn ? today : tomorrow,
    checkOut: isWalkIn ? tomorrow : dayAfter,
    adultCount: '1',
    childCount: '0',
    paymentMethod: PaymentMethod.DirectTransfer, 
    notes: ''
  });
  const [policies, setPolicies] = useState<PrivacyPolicy | null>(null);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [validationFields, setValidationFields] = useState<string[]>([]);
  const modalRef = useAccessibleModal(isOpen, onClose, !isSubmitting);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === formData.roomId), [rooms, formData.roomId]);
  const { adultCount, childCount, validGuestCounts } = parseGuestCounts(formData.adultCount, formData.childCount);

  const nights = useMemo(() => {
    try {
      const d1 = new Date((formData.checkIn || today).replace(/-/g, '/'));
      const d2 = new Date((formData.checkOut || tomorrow).replace(/-/g, '/'));
      const diff = d2.getTime() - d1.getTime();
      return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 1;
    }
  }, [formData.checkIn, formData.checkOut, today, tomorrow]);

  const totalAmount = useMemo(() => {
    if (paymentReviewRebooking) return paymentReviewRebooking.evidence.amount;
    return pricingQuote?.totalAmount ?? (selectedRoom?.pricePerNight || 0) * nights;
  }, [paymentReviewRebooking, pricingQuote?.totalAmount, selectedRoom, nights]);

  const selectedReplacementRooms = useMemo(() => {
    if (!paymentReviewRebooking) return [];
    const byId = new Map(paymentReviewRebooking.roomOptions.rooms.map(room => [room.roomId, room]));
    return replacementRoomIds.map(roomId => byId.get(roomId)).filter(Boolean);
  }, [paymentReviewRebooking, replacementRoomIds]);
  const replacementReady = Boolean(
    paymentReviewRebooking &&
    replacementRoomIds.length === paymentReviewRebooking.roomOptions.requiredRooms &&
    replacementRoomIds.every(Boolean) &&
    new Set(replacementRoomIds).size === replacementRoomIds.length,
  );
  const selectedRoomLabel = paymentReviewRebooking
    ? selectedReplacementRooms.map(room => room?.roomName).join(', ')
    : selectedRoom?.name;

  const availableRooms = useMemo(() => {
    return rooms.filter(room => {
      if (!room.isOnline) return false;
      const isFreeForDates = isRoomAvailable(room.id, formData.checkIn, formData.checkOut);
      if (!isFreeForDates) return false;
      return true;
    });
  }, [rooms, formData.checkIn, formData.checkOut, isRoomAvailable]);

  useEffect(() => {
    if (isPaymentReviewRebooking) return;
    if (formData.roomId) {
      const isValid = availableRooms.some(r => r.id === formData.roomId);
      if (!isValid) setFormData(prev => ({ ...prev, roomId: '' }));
    }
  }, [availableRooms, formData.roomId, isPaymentReviewRebooking]);

  useEffect(() => {
    if (isPaymentReviewRebooking) return;
    setPricingQuote(null);
  }, [
    isPaymentReviewRebooking,
    formData.roomId,
    formData.checkIn,
    formData.checkOut,
    formData.adultCount,
    formData.childCount,
  ]);

  // Initialization effect - strictly only runs when modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setInitResponse(null);
      setPricingQuote(null);
      setIsPricing(false);
      
      let prefilled = {
        guestFirstName: initialData?.guestFirstName || '',
        guestLastName: initialData?.guestLastName || '',
        guestEmail: initialData?.guestEmail || '',
        guestPhone: initialData?.guestPhone || '',
        guestId: ''
      };

      // If we have a selectedGuestId from the context (e.g. from Guests page), use it
      if (selectedGuestId && !prefilled.guestEmail) {
        const guest = guests?.find(g => g.id === selectedGuestId);
        if (guest) {
          prefilled = {
            guestFirstName: guest.firstName,
            guestLastName: guest.lastName,
            guestEmail: guest.email,
            guestPhone: guest.phone,
            guestId: guest.id
          };
        }
      }

      const reviewBooking = paymentReviewRebooking?.booking;
      setFormData({
        roomId: '',
        ...(reviewBooking ? {
          guestFirstName: reviewBooking.guestFirstName,
          guestLastName: reviewBooking.guestLastName,
          guestEmail: reviewBooking.guestEmail,
          guestPhone: reviewBooking.guestPhone,
          guestId: reviewBooking.guestId || '',
        } : prefilled),
        checkIn: reviewBooking ? reviewBooking.checkIn.slice(0, 10) : isWalkIn ? today : tomorrow,
        checkOut: reviewBooking ? reviewBooking.checkOut.slice(0, 10) : isWalkIn ? tomorrow : dayAfter,
        adultCount: String(reviewBooking?.adultCount ?? 1),
        childCount: String(reviewBooking?.childCount ?? 0),
        paymentMethod: PaymentMethod.DirectTransfer,
        notes: reviewBooking ? `Payment review for ${reviewBooking.bookingCode}` : ''
      });
      setReplacementRoomIds(paymentReviewRebooking
        ? Array(paymentReviewRebooking.roomOptions.requiredRooms).fill('')
        : []);
      setAcceptedPolicies(Boolean(paymentReviewRebooking));
      setError(null);
      setIsSubmitting(false);

      if (paymentReviewRebooking) {
        setPolicies(null);
      } else {
        api.get<PrivacyPolicy>('/api/privacy/policies/current')
          .then(setPolicies)
          .catch(() => setError('The current privacy notice and booking terms could not be loaded.'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paymentReviewRebooking?.requestId]);

  // Auto-detect guest ID when email and names match an existing record
  useEffect(() => {
    if (formData.guestEmail && guests) {
      const match = guests.find(g => 
        g?.email?.toLowerCase() === formData.guestEmail.toLowerCase() &&
        g?.firstName?.toLowerCase() === formData.guestFirstName.toLowerCase() &&
        g?.lastName?.toLowerCase() === formData.guestLastName.toLowerCase()
      );
      
      if (match && formData.guestId !== match.id) {
        setFormData(prev => ({ ...prev, guestId: match.id }));
      } else if (!match && formData.guestId) {
        // If no exact match found but we had an ID, clear it
        setFormData(prev => ({ ...prev, guestId: '' }));
      }
    } else if (formData.guestId) {
      setFormData(prev => ({ ...prev, guestId: '' }));
    }
  }, [formData.guestEmail, formData.guestFirstName, formData.guestLastName, guests, formData.guestId]);

  if (!isOpen) return null;

  const validateAndShowConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPricing) return;
    setError(null);

    if (paymentReviewRebooking) {
      if (!replacementReady) {
        setError(`Choose ${paymentReviewRebooking.roomOptions.requiredRooms} different replacement room${paymentReviewRebooking.roomOptions.requiredRooms === 1 ? '' : 's'}.`);
        return;
      }
      setStep('confirm');
      return;
    }

    const missing: string[] = [];

    if (!formData.guestFirstName.trim()) missing.push('guestFirstName');
    if (!formData.guestLastName.trim()) missing.push('guestLastName');
    if (!formData.guestEmail.trim() || !formData.guestEmail.includes('@')) missing.push('guestEmail');
    if (!formData.guestPhone.trim()) missing.push('guestPhone');
    if (!formData.checkIn) missing.push('checkIn');
    if (!formData.checkOut) missing.push('checkOut');
    if (!formData.roomId) missing.push('roomId');

    if (!validGuestCounts) {
      setError('Enter a valid number of adults and children.');
      return;
    }

    if (selectedRoom && adultCount + childCount > selectedRoom.capacity) {
      setError(`${selectedRoom.name} allows up to ${selectedRoom.capacity} guests.`);
      return;
    }

    if (!policies || !acceptedPolicies) {
      setError('Confirm that the guest has accepted the current privacy notice and booking terms.');
      return;
    }

    if (missing.length > 0) {
      setValidationFields(missing);
      setError("Please fill in all highlighted fields.");
      sileo.error({ 
        title: 'Input Required', 
        description: 'One or more required fields are empty or invalid.' 
      });
      return;
    }

    if (new Date(formData.checkOut.replace(/-/g, '/')) <= new Date(formData.checkIn.replace(/-/g, '/'))) {
      setValidationFields(['checkIn', 'checkOut']);
      setError("Departure date must be after Arrival date.");
      sileo.error({ title: 'Date Error', description: 'Check-out must follow Check-in.' });
      return;
    }

    setValidationFields([]);
    setIsPricing(true);
    try {
      const quote = await api.post<PricingQuote>('/api/pricing/quotes', {
        roomId: formData.roomId,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        adultCount,
        childCount,
        roomQuantity: 1,
      });
      if (!quote.quoteId || !quote.quoteToken || quote.roomId !== formData.roomId ||
          !Number.isFinite(quote.totalAmount) || quote.totalAmount < 0 ||
          !Number.isFinite(Date.parse(quote.expiresAtUtc))) {
        throw new Error('The hotel returned an invalid pricing quote. Refresh and try again.');
      }
      setPricingQuote(quote);
      setStep('confirm');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Current pricing could not be loaded. Please try again.';
      setPricingQuote(null);
      setError(message);
      sileo.error({ title: 'Pricing unavailable', description: message });
    } finally {
      setIsPricing(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (paymentReviewRebooking) {
      if (!replacementReady) {
        setError('Select every required replacement room before confirming.');
        setStep('details');
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await api.post<{ message: string }>(
          `/api/bookings/${encodeURIComponent(paymentReviewRebooking.booking.bookingCode)}/review-transfer`,
          {
            decision: 'Confirm',
            confirmationText: 'VERIFY',
            reason: paymentReviewRebooking.evidence.reason,
            bankReference: paymentReviewRebooking.evidence.bankReference,
            amount: paymentReviewRebooking.evidence.amount,
            replacementRoomIds,
          },
        );
        setInitResponse({
          bookingCode: paymentReviewRebooking.booking.bookingCode,
          paymentUrl: null,
          paymentInstruction: result.message,
          amount: paymentReviewRebooking.evidence.amount,
          status: BookingStatus.Confirmed,
          paymentStatus: PaymentStatus.Paid,
        });
        await refreshData();
        setStep('success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'The room could not be assigned. Return to payment review and try again.';
        setError(message);
        sileo.error({ title: 'Room assignment failed', description: message });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!validGuestCounts || !selectedRoom || adultCount + childCount > selectedRoom.capacity) {
      setError('Enter valid whole-number guest counts within the room capacity.');
      setStep('details');
      return;
    }
    if (!pricingQuote || Date.parse(pricingQuote.expiresAtUtc) <= Date.now()) {
      setPricingQuote(null);
      setError('The pricing quote expired. Return to the booking details and request current pricing again.');
      setStep('details');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // Mapping to PascalCase to ensure correct binding on the .NET backend
      const payload: any = {
        RoomId: formData.roomId,
        GuestFirstName: formData.guestFirstName,
        GuestLastName: formData.guestLastName,
        GuestEmail: formData.guestEmail,
        GuestPhone: formData.guestPhone,
        CheckIn: formData.checkIn,
        CheckOut: formData.checkOut,
        AdultCount: adultCount,
        ChildCount: childCount,
        PaymentMethod: formData.paymentMethod,
        Notes: formData.notes,
        AcceptPrivacyPolicy: true,
        PrivacyPolicyVersion: policies?.privacyPolicyVersion,
        AcceptBookingTerms: true,
        BookingTermsVersion: policies?.bookingTermsVersion,
        QuoteId: pricingQuote.quoteId,
        QuoteToken: pricingQuote.quoteToken,
        RoomQuantity: pricingQuote.roomQuantity,
      };

      // Only include GuestId if we have a definite match to avoid Foreign Key or mapping errors
      if (formData.guestId) {
        payload.GuestId = formData.guestId;
      }

      const response = await addBooking(payload);
      if (response.bookingCode) {
        setInitResponse(response);
        await refreshData();
        setStep('success');
      } else {
        throw new Error("Error: No booking ID received.");
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected technical error occurred.";
      if (/pricing quote|after pricing|new quote/i.test(msg)) {
        setPricingQuote(null);
        setStep('details');
      }
      setError(msg);
      sileo.error({
        title: 'Booking Failed',
        description: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToSettlements = () => {
    setActiveTab('settlements');
    onClose();
  };

  const canContinue = isPaymentReviewRebooking
    ? replacementReady
    : Boolean(formData.roomId && availableRooms.length > 0 && policies && !isPricing);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label={isPaymentReviewRebooking ? 'Choose a replacement room' : isWalkIn ? 'Create walk-in booking' : 'Create booking'} tabIndex={-1} className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-[#020617]/98 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-5xl flex flex-col items-center justify-center min-h-[500px] py-4 sm:py-8">
        

        {step === 'confirm' && (
           <div className="w-full max-w-3xl bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-16 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 shadow-3xl">
              <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mb-8 border border-brand-500/20">
                 <FileCheck size={32} className="text-brand-500" />
              </div>
              
              <div className="text-center mb-12">
                <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-3 leading-none">{isPaymentReviewRebooking ? 'Confirm room reassignment' : 'Confirm booking'}</h3>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em]">{isPaymentReviewRebooking ? 'Payment and inventory will be committed together' : 'Check the current hotel quote before confirming'}</p>
              </div>
              
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-1 bg-white/5 border border-white/10 rounded-3xl overflow-hidden mb-12 shadow-inner">
                 <div className="p-8 sm:p-10 space-y-8 bg-black/20">
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Guest</label>
                       <p className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">{formData.guestFirstName} {formData.guestLastName}</p>
                       <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{formData.guestEmail}</p>
                    </div>
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Room</label>
                       <div className="flex items-center gap-3">
                          <Bed size={18} className="text-brand-400" />
                          <p className="text-xl font-black text-slate-300 uppercase">{selectedRoomLabel}</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-8 sm:p-10 space-y-8 bg-black/40">
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">Nights</label>
                       <p className="text-2xl font-black text-white">{nights} Night(s)</p>
                       <p className="text-[11px] text-slate-500 font-medium mt-1">{new Date(formData.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} to {new Date(formData.checkOut).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                    </div>
                    <div>
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">{isPaymentReviewRebooking ? 'Verified amount' : 'Current quoted amount'}</label>
                       <p className="text-4xl font-black text-emerald-500 tracking-tighter leading-none">₦{totalAmount.toLocaleString()}</p>
                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-2 flex items-center gap-2"><Wallet size={10} /> {formData.paymentMethod}</p>
                    </div>
                 </div>
              </div>

              <div className="mb-10 text-center px-8">
                <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic">
                  {isPaymentReviewRebooking
                    ? 'The API will lock and recheck these rooms, assign them to the original reservation, record the verified bank credit, and send the guest an updated confirmation.'
                    : pricingQuote
                      ? `This server quote is valid until ${new Date(pricingQuote.expiresAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Inventory and price are checked again when you confirm.`
                      : 'A current server pricing quote is required before this reservation can be created.'}
                </p>
              </div>

              {error && (
                <div className="w-full p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-[11px] font-black uppercase tracking-tight flex items-center gap-4 mb-8 animate-in shake">
                  <AlertCircle size={20}/> 
                  <div>
                    <p className="font-black underline decoration-rose-500/30 underline-offset-4">Transaction Blocked</p>
                    <p className="opacity-80 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button onClick={() => setStep('details')} disabled={isSubmitting} className="flex-1 py-5 border border-white/10 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-[0.2em] hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-[2] py-5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                   {isSubmitting ? (
                     <>
                        <Loader2 size={18} className="animate-spin" /> 
                        Processing...
                     </>
                   ) : (
                     <>
                        <FileCheck size={18} /> {isPaymentReviewRebooking ? 'Confirm room and payment' : 'Confirm booking'}
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
                    {isPaymentReviewRebooking || isWalkIn ? <Zap size={24}/> : <Calendar size={24}/>}
                  </div>
                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white uppercase leading-[0.85] tracking-tighter">
                    {isPaymentReviewRebooking ? 'NEW\nROOM' : isWalkIn ? 'WALK\nIN' : 'NEW\nBOOKING'}
                  </h2>
               </div>

               <div className="bg-black/30 p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/15 space-y-4 sm:space-y-8 backdrop-blur-md mt-6 lg:mt-0 shadow-2xl">
                  <div className="flex justify-between items-center">
                     <span className="text-[9px] text-white/50 font-black uppercase tracking-widest">Nights</span>
                     <span className="text-lg sm:text-xl text-white font-black">{nights}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-4 sm:pt-8">
                     <div className="w-full">
                       <span className="text-[9px] text-white/50 font-black uppercase tracking-widest block mb-1">Total Amount</span>
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
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{isPaymentReviewRebooking ? `Payment review ${paymentReviewRebooking?.booking.bookingCode}` : 'New booking'}</span>
                  </div>
                  <button type="button" data-modal-close aria-label="Close booking form" onClick={onClose} className="p-2 sm:p-3 hover:bg-white/5 rounded-xl sm:rounded-2xl text-slate-600 transition-all active:scale-90"><X size={20}/></button>
               </div>

               {error && (
                <div className="w-full p-4 mb-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-3 animate-in shake">
                  <AlertCircle size={16}/> 
                  <p>{error}</p>
                </div>
               )}

               <div className="flex-1 space-y-8 sm:space-y-14">
                  <div className="space-y-4 sm:space-y-8">
                      <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] flex items-center gap-2 leading-none"><User size={14} /> Guest Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                              <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">First Name</label>
                              {validationFields.includes('guestFirstName') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                           </div>
                           <input readOnly={isPaymentReviewRebooking} placeholder="John" value={formData.guestFirstName} onChange={e => { setFormData({...formData, guestFirstName: e.target.value}); setValidationFields(prev => prev.filter(f => f !== 'guestFirstName')); }} className={`w-full bg-white/5 border ${validationFields.includes('guestFirstName') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400`} />
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                              <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Last Name</label>
                              {validationFields.includes('guestLastName') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                           </div>
                           <input readOnly={isPaymentReviewRebooking} placeholder="Doe" value={formData.guestLastName} onChange={e => { setFormData({...formData, guestLastName: e.target.value}); setValidationFields(prev => prev.filter(f => f !== 'guestLastName')); }} className={`w-full bg-white/5 border ${validationFields.includes('guestLastName') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400`} />
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                              <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Email</label>
                              {validationFields.includes('guestEmail') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                           </div>
                           <input readOnly={isPaymentReviewRebooking} placeholder="john.doe@enterprise.com" value={formData.guestEmail} onChange={e => { setFormData({...formData, guestEmail: e.target.value}); setValidationFields(prev => prev.filter(f => f !== 'guestEmail')); }} className={`w-full bg-white/5 border ${validationFields.includes('guestEmail') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400`} />
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                              <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Phone</label>
                              {validationFields.includes('guestPhone') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                           </div>
                           <input readOnly={isPaymentReviewRebooking} placeholder="+234..." value={formData.guestPhone} onChange={e => { setFormData({...formData, guestPhone: e.target.value}); setValidationFields(prev => prev.filter(f => f !== 'guestPhone')); }} className={`w-full bg-white/5 border ${validationFields.includes('guestPhone') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400`} />
                        </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label htmlFor="booking-adults" className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Adults</label>
                      <input id="booking-adults" readOnly={isPaymentReviewRebooking} type="number" inputMode="numeric" step={1} required min={1} max={20} value={formData.adultCount} onChange={e => setFormData({...formData, adultCount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="booking-children" className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Children</label>
                      <input id="booking-children" readOnly={isPaymentReviewRebooking} type="number" inputMode="numeric" step={1} required min={0} max={20} value={formData.childCount} onChange={e => setFormData({...formData, childCount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <div className="flex items-center gap-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check In</label>
                              <span className="text-[8px] text-blue-500 font-black uppercase flex items-center gap-1 leading-none"><Clock size={8}/> 14:00</span>
                           </div>
                           {validationFields.includes('checkIn') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                        </div>
                        <input type="date" min={today} readOnly={isWalkIn || isPaymentReviewRebooking} value={formData.checkIn} onChange={e => { setFormData({...formData, checkIn: e.target.value}); setValidationFields(prev => prev.filter(f => f !== 'checkIn' && f !== 'checkOut')); }} className={`w-full bg-white/5 border ${validationFields.includes('checkIn') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-2xl py-4 px-5 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400`} />

                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <div className="flex items-center gap-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check Out</label>
                              <span className="text-[8px] text-rose-500 font-black uppercase flex items-center gap-1 leading-none"><Clock size={8}/> 12:00</span>
                           </div>
                           {validationFields.includes('checkOut') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Invalid</p>}
                        </div>
                        <input type="date" min={formData.checkIn} readOnly={isPaymentReviewRebooking} value={formData.checkOut} onChange={e => { setFormData({...formData, checkOut: e.target.value}); setValidationFields(prev => prev.filter(f => f !== 'checkOut' && f !== 'checkIn')); }} className={`w-full bg-white/5 border ${validationFields.includes('checkOut') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-2xl py-4 px-5 text-sm text-white outline-none focus:bg-white/10 transition-all font-bold read-only:cursor-not-allowed read-only:text-slate-400`} />

                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Payment</label>
                        <select disabled={isPaymentReviewRebooking} value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-brand-400 font-black uppercase tracking-widest outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all disabled:cursor-not-allowed disabled:text-slate-400">
                          {/* <option value={PaymentMethod.Monnify}>Monnify Gateway</option> */}
                          <option value={PaymentMethod.DirectTransfer}>Bank Transfer</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-4 sm:space-y-8">
                     <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-2 leading-none"><Bed size={14} /> {isPaymentReviewRebooking ? 'Select replacement room' : 'Select room'}</h4>
                        {isPaymentReviewRebooking ? (
                          <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{paymentReviewRebooking?.roomOptions.roomTypeName}</span>
                        ) : validationFields.includes('roomId') ? (
                           <span className="text-[8px] text-rose-500 font-black uppercase tracking-widest animate-pulse">Select a room to proceed</span>
                         ) : (
                           <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{availableRooms.length} Rooms Available</span>
                         )}
                     </div>
                     {paymentReviewRebooking ? (
                       <div className="space-y-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                         <p className="text-[10px] font-semibold leading-relaxed text-slate-400">Only clean, online rooms in the originally paid category are shown. Availability is locked and checked again when you confirm.</p>
                         {Array.from({ length: paymentReviewRebooking.roomOptions.requiredRooms }, (_, index) => (
                           <label key={index} className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Room {index + 1}
                             <select
                               required
                               value={replacementRoomIds[index] ?? ''}
                               onChange={event => setReplacementRoomIds(current => current.map((roomId, roomIndex) => roomIndex === index ? event.target.value : roomId))}
                               className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-400/50"
                             >
                               <option value="">Choose an available room</option>
                               {paymentReviewRebooking.roomOptions.rooms.map(room => (
                                 <option key={room.roomId} value={room.roomId} disabled={replacementRoomIds.some((roomId, roomIndex) => roomIndex !== index && roomId === room.roomId)}>
                                   {room.roomNumber} - {room.roomName}
                                 </option>
                               ))}
                             </select>
                           </label>
                         ))}
                       </div>
                     ) : (
                       <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 overflow-y-auto max-h-48 sm:max-h-64 custom-scrollbar pr-3 p-1 rounded-2xl border ${validationFields.includes('roomId') ? 'border-rose-500/30 bg-rose-500/[0.02]' : 'border-transparent'}`}>
                          {availableRooms.map(room => (
                            <button type="button" key={room.id} onClick={() => { setFormData({...formData, roomId: room.id}); setValidationFields(prev => prev.filter(f => f !== 'roomId')); }} className={`p-4 sm:p-5 rounded-2xl border text-center transition-all relative overflow-hidden group/room ${formData.roomId === room.id ? 'bg-brand-600 border-brand-500 text-white shadow-xl scale-105' : 'bg-white/5 border-white/5 text-slate-600 hover:border-white/20 hover:bg-white/[0.07]'} ${validationFields.includes('roomId') && formData.roomId !== room.id ? 'border-rose-500/20' : ''}`}>
                               {room.isOnline && <div className="absolute top-2 right-2"><Globe size={10} className={`${formData.roomId === room.id ? 'text-white' : 'text-emerald-500'} animate-pulse`} /></div>}
                               <p className="text-[12px] sm:text-[14px] font-black leading-tight uppercase tracking-tighter">{room.name}</p>
                               <p className="text-[8px] font-bold uppercase mt-1 opacity-60">₦{(room.pricePerNight/1000).toFixed(0)}k / night</p>
                            </button>
                          ))}
                       </div>
                     )}
                  </div>

                  <div className="pt-6 sm:pt-10 border-t border-white/5">
                     {isPaymentReviewRebooking ? (
                       <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[10px] font-bold leading-relaxed text-slate-400">Guest details, stay dates, category, and verified amount are locked to the original reservation.</div>
                     ) : (
                       <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[10px] font-bold leading-relaxed text-slate-400">
                         <input type="checkbox" checked={acceptedPolicies} onChange={e => setAcceptedPolicies(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600" />
                         <span>The guest has reviewed and accepted the <a href={policies?.privacyPolicyUrl || '#'} target="_blank" rel="noreferrer" className="text-brand-400">Privacy Notice</a> and <a href={policies?.bookingTermsUrl || '#'} target="_blank" rel="noreferrer" className="text-brand-400">Booking Terms</a>.</span>
                       </label>
                     )}
                     <button type="button" onClick={validateAndShowConfirm} disabled={!canContinue} className={`w-full py-5 sm:py-7 rounded-2xl sm:rounded-[2rem] font-black text-[11px] sm:text-[13px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${!canContinue ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : isWalkIn ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-900/20' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-900/20'}`}>
                        {isPricing ? <><Loader2 size={18} className="animate-spin" /> Requesting current price</> : isPaymentReviewRebooking ? <>Review room assignment <ChevronRight size={18} strokeWidth={3} /></> : <>Get current price <ChevronRight size={18} strokeWidth={3} /></>}
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}
        
        {step === 'success' && initResponse && (
          <div className="w-full max-w-2xl bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-16 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 shadow-3xl text-center">
             <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                <ShieldCheck size={40} className="text-emerald-500" />
             </div>
             
             <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-2 leading-none italic">{isPaymentReviewRebooking ? 'Room and payment confirmed' : 'Booking confirmed'}</h3>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-12">{isPaymentReviewRebooking ? 'Updated confirmation queued for delivery' : 'Reservation successfully created'}</p>

             <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-10 mb-10 space-y-6 text-left shadow-inner">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                   <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Booking ID</span>
                   <span className="text-sm font-black text-white uppercase italic">{initResponse.bookingCode}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                   <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{isPaymentReviewRebooking ? 'Verified payment' : 'Booking total'}</span>
                   <span className="text-sm font-black text-emerald-500 italic">₦{initResponse.amount.toLocaleString()}</span>
                </div>
                
                {initResponse.paymentUrl && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                       <span className="text-[9px] text-brand-400 font-black uppercase tracking-widest">Monnify Payment Link</span>
                    </div>
                    <div className="flex gap-2">
                       <input 
                         readOnly 
                         value={initResponse.paymentUrl} 
                         className="flex-1 bg-black/40 border border-white/10 rounded-xl py-4 px-5 text-[11px] text-slate-400 font-medium truncate outline-none"
                       />
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(initResponse.paymentUrl!);
                           sileo.success({ title: 'Link Copied', description: 'Monnify link copied to clipboard.' });
                         }}
                         className="px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                       >
                         <Receipt size={14} /> Copy
                       </button>
                    </div>
                    <p className="text-[9px] text-slate-600 font-medium italic mt-2">* Send this link to the guest for secure online payment.</p>
                  </div>
                )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <button type="button" data-modal-close onClick={onClose} className="py-5 border border-white/10 rounded-2xl text-slate-500 font-black text-[11px] uppercase tracking-[0.2em] hover:text-white hover:bg-white/5 transition-all italic">Close Modal</button>
                <button onClick={handleNavigateToSettlements} className="py-5 bg-white text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all hover:bg-slate-200 active:scale-95 italic">Go to Settlements</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
