import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomStatus, RoomCategory, PropertyFloor } from '../types';
import { X, Check, Camera, Plus, Trash2, Save, Loader2, AlertCircle, Image as ImageIcon, Globe, ShieldCheck } from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: Omit<Room, 'id'>) => Promise<void> | void;
  editingRoom: Room | null;
}

const AMENITIES_DATA = [
  {
    category: '🛏 Basics',
    items: [
      { id: 'Free WiFi', label: 'Free Wi-Fi' },
      { id: 'Air Conditioning', label: 'Air Conditioning' },
      { id: 'Workspace', label: 'Work desk' },
      { id: 'Safe', label: 'Safe Box' },
      { id: 'Room Service', label: 'Room Service' },
    ]
  },
  {
    category: '💻 Comms',
    items: [
      { id: 'Smart TV', label: 'Smart TV' },
      { id: 'Telephone', label: 'Direct Dial' },
    ]
  },
  {
    category: '☕ Extra',
    items: [
      { id: 'Mini Bar', label: 'Mini Bar' },
      { id: 'Balcony', label: 'Balcony' },
    ]
  }
];

const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, onSave, editingRoom }) => {
  const [formData, setFormData] = useState<Omit<Room, 'id'>>({
    roomNumber: '',
    name: '',
    category: 'Standard',
    floor: PropertyFloor.GroundFloor,
    status: RoomStatus.Available,
    pricePerNight: 0,
    capacity: 2,
    size: '20 sqm',
    description: '',
    amenities: [],
    images: [],
    isOnline: false
  });

  const [priceStr, setPriceStr] = useState('0');
  const [sizeNum, setSizeNum] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'details' | 'success'>('details');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingRoom) {
      const { id, createdAt, ...data } = editingRoom;
      setFormData({ ...data, isOnline: data.isOnline || false });
      setPriceStr(data.pricePerNight.toString());
      setSizeNum(parseInt(data.size) || 0);
    } else {
      setFormData({
        roomNumber: '', name: '', category: 'Standard', floor: PropertyFloor.GroundFloor,
        status: RoomStatus.Available, pricePerNight: 0, capacity: 2, size: '20 sqm',
        description: '', amenities: [], images: [], isOnline: false
      });
      setPriceStr('0');
      setSizeNum(20);
    }
    setError(null);
    setStatus('details');
  }, [editingRoom, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'pricePerNight') {
      const numericValue = value.replace(/\D/g, '');
      setPriceStr(numericValue);
      setFormData(prev => ({ ...prev, pricePerNight: parseInt(numericValue) || 0 }));
    } else if (name === 'capacity') {
      setFormData(prev => ({ ...prev, capacity: Number(value) }));
    } else if (name === 'size') {
      const num = Number(value) || 0;
      setSizeNum(num);
      setFormData(prev => ({ ...prev, size: `${num} sqm` }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value as any }));
    }
  };

  const toggleAmenity = (id: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id) ? prev.amenities.filter(a => a !== id) : [...prev.amenities, id]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, images: [...prev.images, reader.result as string] }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomNumber) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(formData);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('details');
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Property ledger synchronization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      <div className="glass-card w-full max-w-5xl max-h-[95vh] sm:max-h-[92vh] flex flex-col rounded-[1.5rem] sm:rounded-[2.5rem] shadow-3xl overflow-hidden border border-white/15 animate-in zoom-in-95 duration-300">
        
        {status === 'success' ? (
          <div className="p-24 flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              <ShieldCheck size={48} className="text-blue-500" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Asset Synchronized</h2>
              <p className="text-[11px] text-blue-400 font-black uppercase tracking-[0.3em] mt-3">
                Unit {formData.roomNumber} updated in property ledger
              </p>
            </div>
            <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest italic max-w-md">The hardware registry has been updated across all distributed operation nodes.</p>
          </div>
        ) : (
          <>
            <div className="px-5 sm:px-10 py-4 sm:py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3 sm:gap-4">
                 <div className={`p-2 sm:p-3 rounded-xl border ${editingRoom ? 'bg-blue-600/15 border-blue-500/20 text-blue-400' : 'bg-emerald-600/15 border-emerald-500/20 text-emerald-400'}`}>
                    {editingRoom ? <Save size={20}/> : <Plus size={20}/>}
                 </div>
                 <div>
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight italic uppercase">
                      {editingRoom ? 'Modify Unit' : 'Onboard Asset'}
                    </h2>
                    <p className="text-[8px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Asset Configuration Protocol</p>
                 </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 sm:p-2.5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all active:scale-90"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-10 custom-scrollbar space-y-6 sm:space-y-8">
                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl sm:rounded-2xl text-rose-400 text-[10px] sm:text-[11px] font-black uppercase tracking-tight flex items-center gap-3 animate-in shake">
                     <AlertCircle size={18} /> {error}
                  </div>
                )}

                <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
                  <div className="flex-1 space-y-4 bg-white/5 p-5 sm:p-8 rounded-xl sm:rounded-[2rem] border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                              <ImageIcon size={14} /> Asset photos
                          </h4>
                          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Physical property imagery</p>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 shadow-lg">
                              <img src={img} className="w-full h-full object-cover" alt="" />
                              <button type="button" onClick={() => setFormData(p => ({...p, images: p.images.filter((_,i) => i !== idx)}))} className="absolute inset-0 bg-rose-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Trash2 size={16}/></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/50 flex flex-col items-center justify-center gap-1.5 text-slate-600 hover:text-blue-500 transition-all bg-slate-900/40">
                            <Camera size={20} />
                            <span className="text-[7px] font-black uppercase">Attach</span>
                          </button>
                          <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </div>
                  </div>

                  <div className="w-full lg:w-64 space-y-4 bg-emerald-500/5 p-5 sm:p-8 rounded-xl sm:rounded-[2rem] border border-emerald-500/10 flex flex-col justify-between">
                    <div>
                       <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                          <Globe size={14} /> Instant Booking
                       </h4>
                       <p className="text-[8px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                         Bypass status checks for date-available bookings.
                       </p>
                    </div>
                    <button type="button" onClick={() => setFormData(p => ({...p, isOnline: !p.isOnline}))} className={`w-full py-3 sm:py-4 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border mt-4 ${formData.isOnline ? 'bg-emerald-600 text-white border-emerald-500 shadow-xl' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                      {formData.isOnline && <Check size={14}/>} {formData.isOnline ? 'Online Support' : 'Offline Managed'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                    <div className="space-y-2">
                        <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Room Identity (No.)</label>
                        <input required name="roomNumber" value={formData.roomNumber} onChange={handleChange} placeholder="e.g. 305" className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 sm:py-4 px-4 sm:px-6 text-sm text-white focus:bg-slate-900 transition-all outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Room Display Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Deluxe King" className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 sm:py-4 px-4 sm:px-6 text-sm text-white focus:bg-slate-900 transition-all outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                    <div className="space-y-2">
                        <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Category</label>
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 sm:py-4 px-4 text-sm text-white outline-none appearance-none cursor-pointer">
                          <option value="Standard">Standard</option>
                          <option value="Business">Business</option>
                          <option value="Executive">Executive</option>
                          <option value="Suite">Suite</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Floor Level</label>
                        <select name="floor" value={formData.floor} onChange={handleChange} className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 sm:py-4 px-4 text-sm text-white outline-none appearance-none cursor-pointer">
                          <option value={PropertyFloor.GroundFloor}>Ground Floor</option>
                          <option value={PropertyFloor.FirstFloor}>1st Floor</option>
                          <option value={PropertyFloor.SecondFloor}>2nd Floor</option>
                          <option value={PropertyFloor.ThirdFloor}>3rd Floor</option>
                          <option value={PropertyFloor.Penthouse}>Penthouse</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 flex justify-between">
                           <span>Dimensions (sqm)</span>
                           <span className="text-blue-500 font-black">{sizeNum} m²</span>
                        </label>
                        <input type="number" name="size" value={sizeNum} onChange={handleChange} placeholder="45" className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 sm:py-4 px-4 text-sm text-white outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 bg-black/20 p-5 sm:p-8 rounded-xl sm:rounded-[2rem] border border-white/5">
                    <div className="space-y-3">
                        <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Daily Tariff (₦)</label>
                        <input name="pricePerNight" value={priceStr} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 sm:py-5 px-4 sm:px-6 text-lg sm:text-2xl font-black text-blue-500 outline-none" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 flex justify-between">
                           <span>Occupancy</span>
                           <span className="text-white font-black">{formData.capacity} Guests</span>
                        </label>
                        <input type="range" name="capacity" min="1" max="8" value={formData.capacity} onChange={handleChange} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-5" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Room Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 sm:py-4 px-4 text-sm text-white outline-none appearance-none cursor-pointer">
                        <option value={RoomStatus.Available}>Available</option>
                        <option value={RoomStatus.Occupied}>Occupied</option>
                        <option value={RoomStatus.Cleaning}>Cleaning</option>
                        <option value={RoomStatus.Maintenance}>Maintenance</option>
                        <option value={RoomStatus.Reserved}>Reserved</option>
                      </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Detailed unit specifications..." className="w-full bg-slate-950/60 border border-white/10 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-sm text-white focus:bg-slate-900 transition-all outline-none min-h-[100px] resize-none" />
                </div>

                <div className="pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-10">
                   {AMENITIES_DATA.map(cat => (
                     <div key={cat.category} className="space-y-4">
                        <h5 className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{cat.category}</h5>
                        <div className="space-y-2.5">
                           {cat.items.map(item => (
                             <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                                <div onClick={() => toggleAmenity(item.id)} className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${formData.amenities.includes(item.id) ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                   {formData.amenities.includes(item.id) && <Check size={12} className="text-white" strokeWidth={4}/>}
                                </div>
                                <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-tight transition-colors ${formData.amenities.includes(item.id) ? 'text-white' : 'text-slate-600'}`}>{item.label}</span>
                             </label>
                           ))}
                        </div>
                     </div>
                   ))}
                </div>
            </form>

            <div className="px-5 sm:px-10 py-4 sm:py-6 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 bg-slate-900/60">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 sm:px-8 py-2 sm:py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Abort</button>
              <button 
                onClick={handleSave} 
                disabled={isSubmitting || !formData.roomNumber} 
                className="px-6 sm:px-12 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Synchronizing Ledger...
                  </>
                ) : (
                  <>
                    {editingRoom ? <Save size={16}/> : <Plus size={16}/>}
                    {editingRoom ? 'Sync Updates' : 'Commit to Property Ledger'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomModal;