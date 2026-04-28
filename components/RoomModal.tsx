import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomStatus, RoomCategory, PropertyFloor } from '../types';
import { X, Check, Camera, Plus, Trash2, Save, Loader2, AlertCircle, Image as ImageIcon, Globe, ShieldCheck } from 'lucide-react';
import { sileo } from 'sileo';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: Omit<Room, 'id'>) => Promise<void> | void;
  editingRoom: Room | null;
}

export const AMENITIES_DATA = [
  {
    category: "Basics",
    items: [
      { id: "wifi", label: "Free Wi-Fi" },
      { id: "ac", label: "Air Conditioning" },
      { id: "workspace", label: "Work Desk" },
      { id: "safe", label: "In-room Safe" },
      { id: "iron", label: "Iron & Ironing Board" },
      { id: "bathtub", label: "Bathtub" },
    ],
  },

  {
    category: "Entertainment & Tech",
    items: [
      { id: "tv", label: "Smart TV" },
      { id: "telephone", label: "Telephone" },
    ],
  },

  {
    category: "Food & Drink",
    items: [
      { id: "mini_bar", label: "Mini Bar" },
      { id: "fridge", label: "Mini Fridge" },
    ],
  },

  {
    category: "Bed & Comfort",
    items: [
      { id: "king_bed", label: "King Bed" },
      { id: "queen_bed", label: "Queen Bed" },
      { id: "extra_bed", label: "Extra Bed Available" },
      { id: "extra_pillows", label: "Extra Pillows" },
    ],
  },
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
    size: '45 sqm',
    description: '',
    amenities: [],
    images: [],
    isOnline: false
  });

  const [priceStr, setPriceStr] = useState('0');
  const [sizeNum, setSizeNum] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationFields, setValidationFields] = useState<string[]>([]);
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
    
    const missing: string[] = [];
    if (!formData.roomNumber.trim()) missing.push('roomNumber');
    if (!formData.name.trim()) missing.push('name');
    if (!formData.category) missing.push('category');
    if (!formData.floor) missing.push('floor');
    if (!formData.size || sizeNum <= 0) missing.push('size');
    if (formData.pricePerNight <= 0) missing.push('pricePerNight');
    if (formData.capacity <= 0) missing.push('capacity');
    if (!formData.description.trim()) missing.push('description');
    if (formData.images.length === 0) missing.push('images');

    if (missing.length > 0) {
      setValidationFields(missing);
      sileo.error({
        title: 'Validation Failed',
        description: 'Please ensure all asset data fields are correctly populated before committing to the ledger.'
      });
      return;
    }

    setValidationFields([]);
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(formData);
      sileo.success({
        title: 'Unit Inventory Synchronized',
        description: `Asset data for Room ${formData.roomNumber} has been successfully reconciled with the property inventory. Diagnostics online.`
      });
      onClose();
    } catch (err: any) {
      const msg = err.message || "Property ledger synchronization failed.";
      setError(msg);
      sileo.error({
        title: 'Ledger Reconciliation Failed',
        description: msg || "The property inventory system rejected the update. Please ensure the room number is unique and the data is valid."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      <div className="glass-card w-full max-w-5xl max-h-[95vh] sm:max-h-[92vh] flex flex-col rounded-[1.5rem] sm:rounded-[2.5rem] shadow-3xl overflow-hidden border border-white/15 animate-in zoom-in-95 duration-300">
        
          <>
            <div className="px-5 sm:px-10 py-4 sm:py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3 sm:gap-4">
                 <div className={`p-2 sm:p-3 rounded-xl border ${editingRoom ? 'bg-blue-600/15 border-blue-500/20 text-blue-400' : 'bg-emerald-600/15 border-emerald-500/20 text-emerald-400'}`}>
                    {editingRoom ? <Save size={20}/> : <Plus size={20}/>}
                 </div>
                 <div>
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight uppercase">
                      {editingRoom ? 'Modify Room' : 'Onboard Asset'}
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
                  <div className={`flex-1 space-y-4 bg-white/5 p-5 sm:p-8 rounded-xl sm:rounded-[2rem] border ${validationFields.includes('images') ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5'}`}>
                      <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                              <ImageIcon size={14} /> Asset photos
                          </h4>
                          {validationFields.includes('images') ? (
                            <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-pulse">Min. 1 Photo Required</p>
                          ) : (
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Physical property imagery</p>
                          )}
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                          {formData.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10 shadow-lg">
                              <img src={img} className="w-full h-full object-cover" alt="" />
                              <button type="button" onClick={() => { setFormData(p => ({...p, images: p.images.filter((_,i) => i !== idx)})); if (formData.images.length <= 1) setValidationFields(prev => [...prev, 'images']); }} className="absolute inset-0 bg-rose-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Trash2 size={16}/></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => fileInputRef.current?.click()} className={`aspect-square rounded-xl border-2 border-dashed ${validationFields.includes('images') ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/10 hover:border-blue-500/50'} flex flex-col items-center justify-center gap-1.5 text-slate-600 hover:text-blue-500 transition-all bg-slate-900/40`}>
                            <Camera size={20} />
                            <span className="text-[7px] font-black uppercase">Attach</span>
                          </button>
                          <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden" onChange={(e) => { handleImageUpload(e); setValidationFields(prev => prev.filter(f => f !== 'images')); }} />
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
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Room Identity (No.)</label>
                           {validationFields.includes('roomNumber') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                        </div>
                        <input name="roomNumber" value={formData.roomNumber} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'roomNumber')); }} placeholder="e.g. 305" className={`w-full bg-slate-950/60 border ${validationFields.includes('roomNumber') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-xl py-3 sm:py-4 px-4 sm:px-6 text-sm text-white focus:bg-slate-900 transition-all outline-none`} />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Room Display Name</label>
                           {validationFields.includes('name') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                        </div>
                        <input name="name" value={formData.name} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'name')); }} placeholder="e.g. Deluxe King" className={`w-full bg-slate-950/60 border ${validationFields.includes('name') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-xl py-3 sm:py-4 px-4 sm:px-6 text-sm text-white focus:bg-slate-900 transition-all outline-none`} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Category</label>
                           {validationFields.includes('category') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                        </div>
                        <select name="category" value={formData.category} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'category')); }} className={`w-full bg-slate-950/60 border ${validationFields.includes('category') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-xl py-3 sm:py-4 px-4 text-sm text-white outline-none appearance-none cursor-pointer`}>
                          <option value="Standard">Standard</option>
                          <option value="Deluxe">Deluxe</option>
                          <option value="Executive">Executive</option>
                          <option value="Presidential Suite">Presidential Suite</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Floor Level</label>
                           {validationFields.includes('floor') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                        </div>
                        <select name="floor" value={formData.floor} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'floor')); }} className={`w-full bg-slate-950/60 border ${validationFields.includes('floor') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-xl py-3 sm:py-4 px-4 text-sm text-white outline-none appearance-none cursor-pointer`}>
                          <option value={PropertyFloor.GroundFloor}>Ground Floor</option>
                          <option value={PropertyFloor.FirstFloor}>1st Floor</option>
                          <option value={PropertyFloor.SecondFloor}>2nd Floor</option>
                          <option value={PropertyFloor.Bungalow}>Bungalow</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Dimensions (sqm)</label>
                           {validationFields.includes('size') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Invalid</p>}
                        </div>
                        <div className="relative">
                            <input type="number" name="size" value={sizeNum} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'size')); }} placeholder="45" className={`w-full bg-slate-950/60 border ${validationFields.includes('size') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-xl py-3 sm:py-4 px-4 text-sm text-white outline-none`} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-500">{sizeNum} m²</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 bg-black/20 p-5 sm:p-8 rounded-xl sm:rounded-[2rem] border border-white/5">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Daily Tariff (₦)</label>
                           {validationFields.includes('pricePerNight') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Price Required</p>}
                        </div>
                        <input name="pricePerNight" value={priceStr} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'pricePerNight')); }} className={`w-full bg-black/40 border ${validationFields.includes('pricePerNight') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-xl py-3 sm:py-5 px-4 sm:px-6 text-lg sm:text-2xl font-black text-blue-500 outline-none`} />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                           <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Occupancy</label>
                           {validationFields.includes('capacity') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                        </div>
                        <div className="pt-2">
                            <input type="range" name="capacity" min="1" max="8" value={formData.capacity} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'capacity')); }} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            <div className="flex justify-between mt-2 px-1">
                               <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">1 Guest</span>
                               <span className="text-[10px] text-white font-black uppercase">{formData.capacity} Guests</span>
                               <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">8 Guests</span>
                            </div>
                        </div>
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
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Description</label>
                       {validationFields.includes('description') && <p className="text-[7px] text-rose-500 font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">Required</p>}
                    </div>
                    <textarea name="description" value={formData.description} onChange={(e) => { handleChange(e); setValidationFields(prev => prev.filter(f => f !== 'description')); }} placeholder="Detailed room specifications..." className={`w-full bg-slate-950/60 border ${validationFields.includes('description') ? 'border-rose-500/50 bg-rose-500/5' : 'border-white/10'} rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-sm text-white focus:bg-slate-900 transition-all outline-none min-h-[100px] resize-none`} />
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
      </div>
    </div>
  );
};

export default RoomModal;