import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomStatus } from '../types';
import { X, Bed, Users, Square, Info, Check, Shield, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { useAccessibleModal } from '../hooks/useAccessibleModal';

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
}

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ isOpen, onClose, room }) => {
  const modalRef = useAccessibleModal(isOpen, onClose);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryImages = useMemo(() => {
    const uploadedImages = (room?.images || []).filter(Boolean);
    return uploadedImages.length > 0
      ? uploadedImages
      : ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800'];
  }, [room?.images]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveImageIndex(0);
    galleryRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [isOpen, room?.id]);

  const showImage = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, galleryImages.length - 1));
    const gallery = galleryRef.current;
    if (!gallery) return;
    gallery.scrollTo({ left: safeIndex * gallery.clientWidth, behavior: 'smooth' });
    setActiveImageIndex(safeIndex);
  };

  const handleGalleryScroll = () => {
    const gallery = galleryRef.current;
    if (!gallery?.clientWidth) return;
    const index = Math.round(gallery.scrollLeft / gallery.clientWidth);
    setActiveImageIndex(Math.max(0, Math.min(index, galleryImages.length - 1)));
  };

  const handleGalleryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' && activeImageIndex > 0) {
      event.preventDefault();
      showImage(activeImageIndex - 1);
    }
    if (event.key === 'ArrowRight' && activeImageIndex < galleryImages.length - 1) {
      event.preventDefault();
      showImage(activeImageIndex + 1);
    }
  };

  if (!isOpen || !room) return null;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label={`Room ${room.roomNumber} details`} tabIndex={-1} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      <div className="glass-card w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row h-auto md:h-[600px] my-8">
        <div className="group/gallery w-full md:w-1/2 relative bg-slate-900 overflow-hidden shrink-0 h-64 md:h-full">
          <div
            ref={galleryRef}
            tabIndex={0}
            role="region"
            aria-label={`${room.name} photo gallery. Use the arrow keys or swipe to view more photos.`}
            onScroll={handleGalleryScroll}
            onKeyDown={handleGalleryKeyDown}
            className="scroll-pane flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
          >
            {galleryImages.map((image, index) => (
              <div key={`${image}-${index}`} className="h-full w-full shrink-0 snap-center snap-always">
                <img
                  src={image}
                  className="h-full w-full select-none object-cover"
                  alt={`${room.name} photo ${index + 1} of ${galleryImages.length}`}
                  draggable={false}
                />
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/20"></div>

          <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md">
            <Images size={14} className="text-brand-400" />
            Photo {activeImageIndex + 1} of {galleryImages.length}
          </div>

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Show previous room photo"
                onClick={() => showImage(activeImageIndex - 1)}
                disabled={activeImageIndex === 0}
                className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/65 text-white shadow-xl backdrop-blur-md transition-all hover:bg-slate-900 disabled:pointer-events-none disabled:opacity-25 md:opacity-0 md:group-hover/gallery:opacity-100 md:focus:opacity-100"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                aria-label="Show next room photo"
                onClick={() => showImage(activeImageIndex + 1)}
                disabled={activeImageIndex === galleryImages.length - 1}
                className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/65 text-white shadow-xl backdrop-blur-md transition-all hover:bg-slate-900 disabled:pointer-events-none disabled:opacity-25 md:opacity-0 md:group-hover/gallery:opacity-100 md:focus:opacity-100"
              >
                <ChevronRight size={22} />
              </button>

              <div className="absolute right-4 top-4 z-20 flex max-w-[42%] items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-slate-950/65 px-2.5 py-2 backdrop-blur-md">
                {galleryImages.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Show room photo ${index + 1}`}
                    aria-current={activeImageIndex === index ? 'true' : undefined}
                    onClick={() => showImage(index)}
                    className={`h-2 shrink-0 rounded-full transition-all ${activeImageIndex === index ? 'w-6 bg-brand-400' : 'w-2 bg-white/35 hover:bg-white/70'}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="pointer-events-none absolute bottom-6 left-6 z-10 max-w-[78%] pr-4">
            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border mb-3 ${
              room.status === RoomStatus.Available ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
              room.status === RoomStatus.Occupied ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
              room.status === RoomStatus.Cleaning ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
              room.status === RoomStatus.Reserved ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' :
              room.status === RoomStatus.Maintenance ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
              'bg-slate-500/20 text-slate-400 border-slate-500/20'
            }`}>
              <span className={`w-1 h-1 rounded-full ${
                 room.status === RoomStatus.Available ? 'bg-emerald-400 animate-pulse' :
                 room.status === RoomStatus.Occupied ? 'bg-blue-400' : 
                 room.status === RoomStatus.Reserved ? 'bg-indigo-400' : 
                 room.status === RoomStatus.Cleaning ? 'bg-amber-400' : 'bg-rose-400'
              }`}></span>
              {room.status}
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase leading-none">Room {room.roomNumber}</h2>
            <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1.5">{room.category} — {room.name}</p>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-6 md:p-10 lg:p-12 overflow-y-auto custom-scrollbar flex flex-col bg-slate-950/40">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Nightly Tariff</p>
              <h3 className="text-3xl font-black text-white">₦{room.pricePerNight.toLocaleString()}</h3>
            </div>
            <button type="button" data-modal-close aria-label="Close room details" onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
              <Bed size={20} className="text-blue-500 mx-auto mb-2" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{room.category}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
              <Users size={20} className="text-blue-500 mx-auto mb-2" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{room.capacity} Guests</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
              <Square size={20} className="text-blue-500 mx-auto mb-2" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{room.size} sqm</p>
            </div>
          </div>

          <div className="space-y-8 flex-1">
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Info size={12}/> Overview</h4>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                {room.description || "Luxurious executive suite designed for modern, high-tier hospitality stays."}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Check size={12}/> Asset Features</h4>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map(amenity => (
                  <span key={amenity} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-500/10">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 mt-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Shield size={16} className="text-brand-500" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Managed Asset Layer</span>
            </div>
            <p className="text-[10px] text-slate-600 font-bold uppercase">Room: {room.floor.replace(/(?!^)([A-Z])/g, ' $1')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;
