import { createPortal } from 'react-dom';
import { Toaster } from 'sileo';

export default function AppToaster() {
  return createPortal(<Toaster position="top-right" theme="dark" options={{ duration: 2500, fill: "#0f172a", autopilot: { expand: 0, collapse: 2500 } }} />, document.body);
}
