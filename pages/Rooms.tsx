import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { Room, RoomStatus, UserRole } from '../types';
import { LayoutGrid, List, Search, Pencil, Trash2, Plus, Eye, SearchX, Wrench, RefreshCw, Square, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import RoomModal from '../components/RoomModal';
import RoomDetailModal from '../components/RoomDetailModal';
import DeleteRoomModal from '../components/DeleteRoomModal';
import MaintenanceModal from '../components/MaintenanceModal';
import PermissionWrapper from '../components/PermissionWrapper';

const Rooms: React.FC = () => {
  const { rooms, updateRoom, addRoom, deleteRoom, toggleRoomMaintenance, selectedRoomId: globalSelectedRoomId, setSelectedRoomId: setGlobalSelectedRoomId, refreshData } = useHotel();
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [roomForMaintenance, setRoomForMaintenance] = useState<Room | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const categories = ['All', 'Standard', 'Business', 'Executive', 'Suite'];

  useEffect(() => {
    if (globalSelectedRoomId) {
      const targetRoom = rooms.find(r => r.id === globalSelectedRoomId);
      if (targetRoom) {
        setViewingRoom(targetRoom);
        setIsDetailOpen(true);
        setGlobalSelectedRoomId(null);
      }
    }
  }, [globalSelectedRoomId, rooms, setGlobalSelectedRoomId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleSaveRoom = async (roomData: Omit<Room, 'id'>) => {
    if (editingRoom) {
      await updateRoom(editingRoom.id, roomData);
    } else {
      await addRoom(roomData);
    }
  };

  const filteredRooms = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return (rooms || [])
      .filter(room => {
        const searchableString = `room ${room.roomNumber} ${room.name} ${room.category}`.toLowerCase();
        const matchesSearch = !query || searchableString.includes(query);
        // Robust case-insensitive comparison for categories
        const matchesCategory = categoryFilter === 'All' || 
          room.category?.toLowerCase() === categoryFilter.toLowerCase();
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => (b.roomNumber || '').localeCompare(a.roomNumber || ''));
  }, [rooms, searchQuery, categoryFilter]);

  const totalPages = Math.ceil(filteredRooms.length / PAGE_SIZE);
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRooms.slice(start, start + PAGE_SIZE);
  }, [filteredRooms, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, categoryFilter]);

  const stats = useMemo(() => [
    { label: 'Total Units', value: rooms.length, color: 'text-blue-400' },
    { label: 'Occupied', value: rooms.filter(r => r.status === RoomStatus.Occupied).length, color: 'text-emerald-400' },
    { label: 'Asset Readiness', value: rooms.filter(r => r.status === RoomStatus.Available).length, color: 'text-blue-400' },
    { label: 'Reserved', value: rooms.filter(r => r.status === RoomStatus.Reserved).length, color: 'text-indigo-400' },
  ], [rooms]);

  const getStatusClasses = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.Available: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case RoomStatus.Occupied: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case RoomStatus.Cleaning: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case RoomStatus.Maintenance: return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case RoomStatus.Reserved: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
            <p className="adaptive-text-xs text-blue-400 font-black uppercase tracking-widest leading-none">Asset Inventory</p>
          </div>
          <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase italic leading-none">Unit Management</h2>
        </div>
        
        <PermissionWrapper allowedRoles={[UserRole.Admin, UserRole.Manager]}>
          <button onClick={() => { setEditingRoom(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl adaptive-text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg italic"><Plus size={16}/> Onboard New Asset</button>
        </PermissionWrapper>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 rounded-2xl border border-white/5">
            <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest block mb-1.5">{s.label}</span>
            <h4 className={`text-2xl font-black ${s.color}`}>{s.value}</h4>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl flex flex-col overflow-hidden border border-white/5 shadow-xl min-h-[600px]">
        <div className="px-6 py-4 border-b border-white/5 flex flex-col lg:flex-row items-center justify-between bg-slate-900/40 gap-4">
          <div className="flex items-center gap-3 flex-1 w-full max-w-2xl">
             <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14}/>
               <input 
                type="text" 
                placeholder="Lookup Units by Identity..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-white outline-none focus:bg-slate-900 transition-all placeholder:text-slate-700 italic" 
               />
             </div>
          </div>
          
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="flex gap-1 bg-black/40 p-1 rounded-sm border border-white/5 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  {cat === 'All' ? 'All Classes' : cat}
                </button>
              ))}
            </div>
            
            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0 ml-auto lg:ml-0">
               <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}><List size={16}/></button>
               <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}><LayoutGrid size={16}/></button>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1">
          {paginatedRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-20"><SearchX size={64} className="mb-4 text-slate-700" /><p className="adaptive-text-lg font-black uppercase text-slate-500 italic">No assets detected</p></div>
          ) : (
            viewMode === 'list' ? (
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="text-slate-600 text-[9px] font-black uppercase tracking-widest border-b border-white/5 bg-slate-900/10">
                      <th className="responsive-table-padding">Unit Identity</th>
                      <th className="responsive-table-padding col-priority-med">Classification</th>
                      <th className="responsive-table-padding text-center">Status Protocol</th>
                      <th className="responsive-table-padding col-priority-low">Nightly Tariff</th>
                      <th className="responsive-table-padding text-right">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedRooms.map((room) => (
                      <tr key={room.id} onClick={() => { setViewingRoom(room); setIsDetailOpen(true); }} className="hover:bg-white/[0.02] transition-all group cursor-pointer border-l-4 border-transparent hover:border-blue-500">
                        <td className="responsive-table-padding">
                          <div className="flex items-center gap-4">
                            <img src={room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=100'} className="w-12 h-10 rounded-lg object-cover ring-1 ring-white/5 shadow-lg shrink-0" alt=""/>
                            <div className="min-w-0">
                               <p className="adaptive-text-sm font-black text-white leading-none mb-1.5 uppercase italic truncate">Room {room.roomNumber}</p>
                               <div className="flex items-center gap-2"><p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest truncate">{room.name}</p>{room.isOnline && <Globe size={10} className="text-emerald-500" />}</div>
                            </div>
                          </div>
                        </td>
                        <td className="responsive-table-padding col-priority-med">
                            <p className="adaptive-text-sm font-black text-slate-300 uppercase italic truncate">{room.category}</p>
                            <p className="text-[8px] text-slate-700 font-bold uppercase mt-1">{room.floor.replace(/([A-Z])/g, ' $1')}</p>
                        </td>
                        <td className="responsive-table-padding text-center">
                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border whitespace-nowrap ${getStatusClasses(room.status)}`}>{room.status}</span>
                        </td>
                        <td className="responsive-table-padding col-priority-low">
                          <p className="adaptive-text-sm font-black text-white italic">₦{room.pricePerNight.toLocaleString()}</p>
                        </td>
                        <td className="responsive-table-padding text-right">
                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                               <PermissionWrapper allowedRoles={[UserRole.Admin, UserRole.Manager]}>
                                 <button onClick={(e) => { e.stopPropagation(); setRoomForMaintenance(room); setIsMaintenanceModalOpen(true); }} className={`p-2 rounded-lg border transition-all ${room.status === RoomStatus.Maintenance ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-white/5 text-slate-600 border-white/5 hover:text-amber-500'}`}><Wrench size={14}/></button>
                                 <button onClick={(e) => { e.stopPropagation(); setEditingRoom(room); setIsModalOpen(true); }} className="p-2 bg-white/5 text-slate-600 hover:text-blue-400 rounded-lg border border-white/5 transition-all"><Pencil size={14}/></button>
                                 <button onClick={(e) => { e.stopPropagation(); setRoomToDelete(room); setIsDeleteModalOpen(true); }} className="p-2 bg-white/5 text-slate-600 hover:text-rose-500 rounded-lg border border-white/5 transition-all"><Trash2 size={14}/></button>
                               </PermissionWrapper>
                               <button onClick={() => { setViewingRoom(room); setIsDetailOpen(true); }} className="p-2 bg-white/5 text-slate-600 hover:text-white rounded-lg border border-white/5 transition-all"><Eye size={14}/></button>
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {paginatedRooms.map((room) => (
                  <div key={room.id} onClick={() => { setViewingRoom(room); setIsDetailOpen(true); }} className="group glass-card rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all cursor-pointer shadow-lg border border-white/5 flex flex-col h-full">
                    <div className="aspect-[4/3] relative overflow-hidden shrink-0">
                      <img src={room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt=""/>
                      <div className="absolute top-3 right-3"><span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border backdrop-blur-md ${getStatusClasses(room.status)}`}>{room.status}</span></div>
                    </div>
                    <div className="p-4 flex justify-between items-start flex-1 bg-slate-900/20">
                      <div className="min-w-0 pr-2">
                         <p className="adaptive-text-base font-black text-white uppercase italic leading-none mb-1 group-hover:text-blue-400 truncate">Room {room.roomNumber}</p>
                         <p className="text-[9px] text-slate-600 font-bold uppercase truncate">{room.category}</p>
                         <div className="flex items-center gap-1.5 mt-3 text-slate-700"><Square size={8} /><span className="text-[8px] font-black uppercase tracking-widest">{room.size}</span></div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="adaptive-text-base font-black text-white italic">₦{(room.pricePerNight/1000).toFixed(0)}k</p>
                        <p className="text-[8px] text-slate-700 font-bold uppercase">Tariff</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="px-6 py-4 bg-slate-950/40 border-t border-white/5 flex items-center justify-between">
           <div className="text-[9px] text-slate-600 font-black uppercase italic tracking-widest">Total Managed Nodes • {filteredRooms.length}</div>
           <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={16} /></button>
              <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[10px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={16} /></button>
           </div>
        </div>
      </div>

      <RoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveRoom} editingRoom={editingRoom} />
      <RoomDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} room={viewingRoom} />
      <DeleteRoomModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={deleteRoom} room={roomToDelete} />
      <MaintenanceModal isOpen={isMaintenanceModalOpen} onClose={() => setIsMaintenanceModalOpen(false)} onConfirm={toggleRoomMaintenance} room={roomForMaintenance} />
    </div>
  );
};

export default Rooms;