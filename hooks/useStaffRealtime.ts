import { useEffect, useRef } from "react";
import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { api } from "../lib/api";
import { appConfig } from "../config/environment";

const hubUrl = () => {
  if (appConfig.apiBaseUrl.startsWith("/")) return "/hubs/notifications";
  return `${appConfig.apiBaseUrl.replace(/\/api\/?$/i, "")}/hubs/notifications`;
};

export const useStaffRealtime = (
  enabled: boolean,
  onNotification: () => void,
  onAccessRevoked: () => void,
) => {
  const notificationRef = useRef(onNotification);
  const revokedRef = useRef(onAccessRevoked);
  notificationRef.current = onNotification;
  revokedRef.current = onAccessRevoked;

  useEffect(() => {
    if (!enabled) return;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl(), {
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
        accessTokenFactory: async () => {
          const response = await api.post<{ ticket: string }>("/api/notifications/realtime-ticket");
          return response.ticket;
        },
      })
      .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("ReceiveNotification", () => notificationRef.current());
    connection.on("AccessRevoked", () => {
      api.removeToken();
      revokedRef.current();
    });

    void connection.start().catch(() => {
      // Background polling remains available if the realtime transport is down.
    });

    return () => {
      void connection.stop();
    };
  }, [enabled]);
};
