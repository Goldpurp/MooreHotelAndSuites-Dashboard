import { createPortal } from 'react-dom';
import { Toaster } from 'sileo';

export default function AppToaster() {
  return createPortal(<Toaster position="top-right" theme="dark" options={{ duration: 7000, fill: "#0f172a", autopilot: { expand: 0, collapse: 7000 } }} />, document.body);
}
