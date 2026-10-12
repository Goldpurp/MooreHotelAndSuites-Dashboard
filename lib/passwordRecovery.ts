export type PasswordRecoveryMode = "setup-password" | "reset-password";

export function passwordRecoveryMode(location: Pick<Location, "pathname" | "hash">): PasswordRecoveryMode | null {
  const path = location.pathname.replace(/\/+$/, "");
  const route = new URLSearchParams(location.hash.slice(1)).get("route");
  if (path === "/setup-password" || path === "/reset-password") return path.slice(1) as PasswordRecoveryMode;
  return route === "setup-password" || route === "reset-password" ? route : null;
}
