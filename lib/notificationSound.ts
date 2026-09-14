const SOUND_PREFERENCE_KEY = "mhs_notification_sound_enabled";
const SOUND_PREFERENCE_EVENT = "mhs:notification-sound-preference";
const SOUND_COOLDOWN_MS = 3_000;

let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextConstructor =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextConstructor) return null;
  audioContext = new AudioContextConstructor();
  return audioContext;
}

export function isNotificationSoundEnabled() {
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, String(enabled));
  } catch {
    // The in-memory preference in Settings still applies for this session.
  }
  window.dispatchEvent(
    new CustomEvent(SOUND_PREFERENCE_EVENT, { detail: { enabled } }),
  );
}

export function subscribeToNotificationSoundPreference(
  listener: (enabled: boolean) => void,
) {
  const handlePreference = (event: Event) => {
    const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
    if (typeof enabled === "boolean") listener(enabled);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SOUND_PREFERENCE_KEY) listener(event.newValue !== "false");
  };

  window.addEventListener(SOUND_PREFERENCE_EVENT, handlePreference);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(SOUND_PREFERENCE_EVENT, handlePreference);
    window.removeEventListener("storage", handleStorage);
  };
}

export async function armNotificationSound() {
  if (!isNotificationSoundEnabled()) return false;
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return false;
    }
  }
  return context.state === "running";
}

function scheduleTone(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  startsAt: number,
  duration: number,
  peakVolume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(peakVolume, startsAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

export async function playNotificationSound(options: { preview?: boolean } = {}) {
  if (!isNotificationSoundEnabled()) return false;
  const now = Date.now();
  if (!options.preview && now - lastPlayedAt < SOUND_COOLDOWN_MS) return false;
  if (!(await armNotificationSound())) return false;

  const context = getAudioContext();
  if (!context) return false;
  const startsAt = context.currentTime + 0.015;
  const master = context.createGain();
  master.gain.setValueAtTime(0.72, startsAt);
  master.connect(context.destination);

  scheduleTone(context, master, 659.25, startsAt, 0.28, 0.11);
  scheduleTone(context, master, 830.61, startsAt + 0.12, 0.34, 0.085);
  window.setTimeout(() => master.disconnect(), 650);
  lastPlayedAt = now;
  return true;
}

export function installNotificationSoundUnlock() {
  let disposed = false;
  const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown"];

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    for (const eventName of events) {
      window.removeEventListener(eventName, unlock, true);
    }
  };
  const unlock = () => {
    void armNotificationSound().then((ready) => {
      if (ready) cleanup();
    });
  };

  for (const eventName of events) {
    window.addEventListener(eventName, unlock, {
      capture: true,
      passive: true,
    });
  }
  return cleanup;
}
