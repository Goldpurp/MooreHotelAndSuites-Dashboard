export function paymentStatusLabel(status?: string) {
  const labels: Record<string, string> = {paid:'Paid', unpaid:'Unpaid', paymentreported:'Payment reported', awaitingverification:'Awaiting verification', refundpending:'Refund pending', refunded:'Refunded', partial:'Partially paid', partiallypaid:'Partially paid'};
  return labels[(status || '').replace(/[\s_-]/g, '').toLowerCase()] || 'Unknown';
}
export function roomStateCounts(rooms: {status: string}[]) {
  const states = [['Occupied','#3b82f6'],['Available','#10b981'],['Dirty','#fb7185'],['Cleaning','#f59e0b'],['Clean','#2dd4bf'],['Inspected','#a78bfa'],['Reserved','#6366f1'],['Maintenance','#ef4444'],['OutOfOrder','#f97316'],['Unknown','#94a3b8']];
  const known = new Set(states.map(([name])=>name.toLowerCase()));
  return states.map(([name,color])=>({name: name === 'OutOfOrder' ? 'Out of order' : name, color, value: rooms.filter(room => (known.has(String(room.status).toLowerCase()) ? String(room.status).toLowerCase() : 'unknown') === name.toLowerCase()).length}));
}
