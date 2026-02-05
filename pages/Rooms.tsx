
import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { Room, RoomStatus, UserRole } from '../types';
import { LayoutGrid, List, Search, Pencil, Trash2, Plus, Eye, SearchX, Wrench, RefreshCw, Square, Globe } from 'lucide-react';
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
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

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

  const stats = useMemo(() => [
    { label: 'Inventory', value: rooms.length, color: 'text-blue-400' },
    { label: 'Occupied', value: rooms.filter(r => r.status === RoomStatus.Occupied).length, color: 'text-emerald-400' },
    { label: 'Ready', value: rooms.filter(r => r.status === RoomStatus.Available).length, color: 'text-blue-400' },
    { label: 'Service', value: rooms.filter(r => r.status === RoomStatus.Cleaning || r.status === RoomStatus.Maintenance).length, color: 'text-rose-400' },
  ], [rooms]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return rooms.filter(room => {
      const searchableString = `room ${room.roomNumber} ${room.name} ${room.category}`.toLowerCase();
      const matchesSearch = searchableString.includes(query);
      const matchesCategory = categoryFilter === 'All Categories' || room.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [rooms, searchQuery, categoryFilter]);

  const handleSaveRoom = async (roomData: Omit<Room, 'id'>) => {
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, roomData);
      } else {
        await addRoom(roomData);
      }
      setEditingRoom(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Room synchronization failure:", error);
    }
  };

  const handleOpenDeleteModal = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    setRoomToDelete(room);
    setIsDeleteModalOpen(true);
  };

  const handleOpenMaintenanceModal = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    setRoomForMaintenance(room);
    setIsMaintenanceModalOpen(true);
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteRoom(id);
    setIsDeleteModalOpen(false);
    setRoomToDelete(null);
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const getStatusClasses = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.Available:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
      case RoomStatus.Occupied:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
      case RoomStatus.Cleaning:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
      case RoomStatus.Maintenance:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
      case RoomStatus.Reserved:
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-blue-500 rounded-full"></span>
            <p className="text-[9px] text-blue-400 font-black uppercase tracking-dash">Property Assets</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">Room Inventory</h2>
          <p className="text-slate-500 text-[11px] mt-0.5 font-bold uppercase tracking-widest italic opacity-70">Secured Hardware Node Management</p>
        </div>
        
        {/* Fix: Using UserRole enum members instead of strings */}
        <PermissionWrapper allowedRoles={[UserRole.Admin, UserRole.Manager]}>
          <button 
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-2xl shadow-blue-500/20 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform"/> Onboard New Unit
          </button>
        </PermissionWrapper>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 rounded-2xl border border-white/5 shadow-lg">
            <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest block mb-1.5">{s.label}</span>
            <h4 className={`text-3xl font-black ${s.color}`}>{s.value}</h4>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl flex flex-col overflow-hidden min-h-[450px] border border-white/5 shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-slate-900/40">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
             <button 
               onClick={handleManualRefresh}
               className={`p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
             >
               <RefreshCw size={16} />
             </button>
             <div className="relative flex-1">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16}/>
               <input 
                type="text" 
                placeholder="Filter by No., Name, or Class..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-[12px] text-slate-300 outline-none focus:bg-slate-900 transition-all focus:border-blue-500/40"
               />
             </div>
             <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950/40 border border-white/10 rounded-xl py-3 px-5 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none appearance-none cursor-pointer hover:border-white/20 transition-all"
             >
               <option value="All Categories">All Classes</option>
               <option value="Standard">Standard</option>
               <option value="Business">Business</option>
               <option value="Executive">Executive</option>
               <option value="Suite">Suite</option>
             </select>
          </div>
          <div className="flex gap-1.5 p-1.5 bg-black/40 rounded-xl border border-white/5">
             <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}><List size={18}/></button>
             <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}><LayoutGrid size={18}/></button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 opacity-30">
              <SearchX size={56} className="text-slate-700 mb-6" />
              <p className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-500">Inventory result null</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 mt-2">Check filter parameters</p>
            </div>
          ) : (
            viewMode === 'list' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-600 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-4">Unit Identity</th>
                    <th className="px-6 py-4">Classification</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4">Tariff</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRooms.map((room) => (
                    <tr key={room.id} onClick={() => { setViewingRoom(room); setIsDetailOpen(true); }} className="hover:bg-blue-600/5 transition-all group cursor-pointer">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <img src={room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=100'} className="w-16 h-12 rounded-xl object-cover ring-2 ring-white/5 group-hover:ring-blue-500/40 transition-all shadow-md" alt=""/>
                          <div>
                             <p className="text-[16px] font-black text-white group-hover:text-blue-400 transition-colors tracking-tight">Room {room.roomNumber}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               <p className="text-[10px] text-slate-600 font-black uppercase tracking-dash">{room.name}</p>
                               {room.isOnline && (
                                 <span className="flex items-center gap-1 text-[8px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 shadow-sm">
                                   <Globe size={10} /> Online
                                 </span>
                               )}
                             </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                          <span className="text-[12px] font-black text-slate-300 uppercase tracking-tighter italic">{room.category}</span>
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-dash mt-0.5">{room.floor.replace(/([A-Z])/g, ' $1')}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                          <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${getStatusClasses(room.status)}`}>
                            {room.status}
                          </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-[16px] font-black text-white tracking-tight">₦{room.pricePerNight.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">Fixed/Night</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2.5" onClick={e => e.stopPropagation()}>
                             {/* Fix: Using UserRole enum members instead of strings */}
                             <PermissionWrapper allowedRoles={[UserRole.Admin, UserRole.Manager]}>
                               <button onClick={(e) => handleOpenMaintenanceModal(e, room)} className={`p-3 rounded-xl border transition-all ${room.status === RoomStatus.Maintenance ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg' : 'bg-white/5 text-slate-500 border-white/10 hover:text-amber-500'}`} title="Toggle Maintenance">
                                  <Wrench size={18}/>
                               </button>
                               <button onClick={(e) => openEditModal(e, room)} className="p-3 bg-white/5 text-slate-500 hover:text-blue-400 rounded-xl border border-white/10 transition-all"><Pencil size={18}/></button>
                               <button onClick={(e) => handleOpenDeleteModal(e, room)} className="p-3 bg-white/5 text-slate-500 hover:text-rose-500 rounded-xl border border-white/10 transition-all"><Trash2 size={18}/></button>
                             </PermissionWrapper>
                             <button onClick={() => { setViewingRoom(room); setIsDetailOpen(true); }} className="p-3 bg-white/5 text-slate-500 hover:text-white rounded-xl border border-white/10 transition-all"><Eye size={18}/></button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
                {filteredRooms.map((room) => (
                  <div key={room.id} onClick={() => { setViewingRoom(room); setIsDetailOpen(true); }} className="group glass-card rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all cursor-pointer shadow-xl border border-white/10">
                    <div className="aspect-[16/10] relative overflow-hidden">
                      <img src={room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt=""/>
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                         <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border backdrop-blur-md transition-all ${getStatusClasses(room.status)}`}>
                           {room.status}
                         </span>
                         {room.isOnline && (
                           <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/20 text-emerald-400 backdrop-blur-md flex items-center gap-2">
                             <Globe size={12} className="animate-pulse" /> Instant Bookable
                           </span>
                         )}
                      </div>
                    </div>
                    <div className="p-5 flex justify-between items-start">
                      <div>
                         <p className="text-[18px] font-black text-white group-hover:text-blue-400 transition-colors tracking-tight">Room {room.roomNumber}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">{room.category}</p>
                         <div className="flex items-center gap-1.5 mt-2 text-slate-600">
                            <Square size={10} />
                            <span className="text-[9px] font-black uppercase">{room.size} sqm</span>
                         </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[16px] font-black text-white tracking-tighter">₦{room.pricePerNight.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">Rate</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <RoomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveRoom} editingRoom={editingRoom} />
      <RoomDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} room={viewingRoom} />
      <DeleteRoomModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} room={roomToDelete} />
      <MaintenanceModal isOpen={isMaintenanceModalOpen} onClose={() => setIsMaintenanceModalOpen(false)} onConfirm={toggleRoomMaintenance} room={roomForMaintenance} />
    </div>
  );
};

export default Rooms;
