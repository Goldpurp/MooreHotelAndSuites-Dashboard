// Local-only visual fixture. No API requests or production credentials are used.
// Run: node scripts/preview-housekeeping.mjs
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const context = `
import React from 'react';
export const Context = React.createContext(null);
export const useHotel = () => React.useContext(Context);
`;
const api = `
let tasks = [{id:'sample-cleaning',roomId:'sample-room',roomNumber:'TEST 101',type:'CheckoutCleaning',status:'Pending',createdAtUtc:new Date(Date.now()-3*3600000).toISOString()}];
export const api = {
  get: async () => structuredClone(tasks),
  put: async (path, request) => {
    const task=tasks.find(item=>path.endsWith(item.id));
    if(!task) throw new Error('Unknown fixture task');
    task.status=request.status;
    if(request.status==='InProgress') task.assignedToUserId='fixture-user';
    if(request.status==='Completed' && task.type!=='Inspection') tasks.push({id:'sample-inspection',roomId:task.roomId,roomNumber:task.roomNumber,type:'Inspection',status:'Pending',createdAtUtc:new Date().toISOString()});
    if(request.status==='Completed' && task.type==='Inspection' && !request.inspectionPassed) tasks.push({id:'sample-correction',roomId:task.roomId,roomNumber:task.roomNumber,type:'CheckoutCleaning',status:'Pending',createdAtUtc:new Date().toISOString()});
    return structuredClone(task);
  }
};`;
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Context} from 'fixture:context';
import {ConfirmationProvider} from '/components/ConfirmationProvider.tsx';
import {HousekeepingProvider,HousekeepingPage,HousekeepingReminder} from '/components/HousekeepingWorkspace.tsx';
import '/index.css';
function Fixture() {
 const [activeTab,setActiveTab]=React.useState('dashboard');
 const [role,setRole]=React.useState('Admin');
 const currentUser={id:'fixture-user',role,department:'Housekeeping'};
 return React.createElement(Context.Provider,{value:{currentUser,isAuthenticated:true,activeTab,setActiveTab,refreshData:async()=>{}}},
 React.createElement(ConfirmationProvider,null,React.createElement(HousekeepingProvider,null,
 React.createElement('main',{className:'min-h-screen bg-slate-950 text-white p-6'},
 React.createElement('p',{className:'mb-4 text-amber-300'},'LOCAL TEST ONLY — sample tasks; no live hotel data'),
 React.createElement('button',{className:'m-2 p-3 border',onClick:()=>setRole(role==='Admin'?'Staff':'Admin')},'Switch role: '+role),
 React.createElement('button',{className:'m-2 p-3 border',onClick:()=>setActiveTab('housekeeping')},'Open housekeeping'),
 activeTab==='housekeeping'?React.createElement(HousekeepingPage):React.createElement('p',null,'Sample dashboard'),
 React.createElement(HousekeepingReminder)))));
}
createRoot(document.getElementById('root')).render(React.createElement(Fixture));`;
const server = await createServer({
  configFile: false,
  server: { host: '127.0.0.1', port: 5176, strictPort: true },
  plugins: [tailwindcss(), {
    name: 'isolated-housekeeping-fixture',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'fixture:entry') return '\0fixture:entry';
      if (source === 'fixture:context' || source.endsWith('/store/HotelContext')) return '\0fixture:context';
      if (source.endsWith('/lib/api')) return '\0fixture:api';
    },
    load(id) {
      if (id === '\0fixture:entry') return entry;
      if (id === '\0fixture:context') return context;
      if (id === '\0fixture:api') return api;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url !== '/') return next();
        response.setHeader('Content-Type', 'text/html');
        response.end('<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="root"></div><script type="module" src="/@id/__x00__fixture:entry"></script></body></html>');
      });
    },
  }],
});
await server.listen();
server.printUrls();
