const normalizeWords = (value?: string) =>
  String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ");

export const getPrivateGuestName = (value?: string) => {
  const words = normalizeWords(value).split(" ").filter(Boolean);
  if (words.length === 0) return "Guest";
  if (words.length === 1) return words[0];
  return `${words[0]} ${words.at(-1)?.charAt(0).toUpperCase()}.`;
};

export const getStaffDisplayName = (
  value?: string,
  fallback = "Authorized staff",
) => {
  const normalized = normalizeWords(value);
  const lower = normalized.toLowerCase();

  if (!normalized) return fallback;
  if (lower.includes("system")) return "Automated system";
  if (lower.includes("administrator") || /\badmin\b/.test(lower)) {
    return "Hotel administrator";
  }
  if (lower.includes("manager")) return "Hotel manager";
  if (lower === "staff" || lower.includes("hotel staff")) return "Hotel staff";

  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 1) return words[0];
  return `${words[0]} ${words.at(-1)?.charAt(0).toUpperCase()}.`;
};

export const getBookingReferenceDisplay = (value?: string) => {
  const normalized = String(value || "").trim();
  if (!normalized || /^(system|sys[-_ ]?tr(?:ace|ce))$/i.test(normalized)) {
    return "Not available";
  }
  return normalized;
};

export const getFriendlyAreaName = (value?: string) => {
  const normalized = normalizeWords(value)
    .replace(/\b(dto|entity|model|record)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "Hotel record";
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const formatPrivateDateTime = (value?: string) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};
