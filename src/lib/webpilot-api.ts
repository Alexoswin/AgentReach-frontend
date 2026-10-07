"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "./localAuth";
import { API_BASE_URL, apiRequest, type LooseApiResponse } from "./api";

// Every WebPilot call goes through the backend, which checks the access token
// before proxying to the WebPilot service. Never point the browser at the
// service directly: that would skip the token check.
const WEBPILOT_PATH = "/webpilot";

// Starting or steering a browser run can take longer than an ordinary call.
const WEBPILOT_TIMEOUT_MS = 45000;

function webpilotRequest<T = LooseApiResponse>(path: string, init?: RequestInit) {
  return apiRequest<T>(`${WEBPILOT_PATH}${path}`, init, WEBPILOT_TIMEOUT_MS);
}

/** ws(s)://<backend host>/ws/webpilot/<runId>?token=… — main.ts checks the token. */
function webpilotSocketUrl(runId: string, token: string | null) {
  const url = new URL(API_BASE_URL, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/webpilot/${encodeURIComponent(runId)}`;
  url.search = "";
  // Browsers cannot set headers on a WebSocket, so the token goes in the query.
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

export const webpilotApi = {
  startTask: (prompt: string, modelTier: string = "auto") =>
    webpilotRequest("/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, modelTier }),
    }),

  listTasks: (limit: number = 20) => webpilotRequest(`/runs?limit=${limit}`),

  getActiveTask: () => webpilotRequest("/runs/active"),

  getTask: (runId: string) => webpilotRequest(`/runs/${encodeURIComponent(runId)}`),

  stopTask: (runId: string) =>
    webpilotRequest(`/runs/${encodeURIComponent(runId)}/stop`, { method: "POST" }),

  pauseTask: (runId: string) =>
    webpilotRequest(`/runs/${encodeURIComponent(runId)}/pause`, { method: "POST" }),

  resumeTask: (runId: string) =>
    webpilotRequest(`/runs/${encodeURIComponent(runId)}/resume`, { method: "POST" }),
};

export function useWebPilotSocket(runId: string | null) {
  const [events, setEvents] = useState<any[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("unknown");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!runId) return;
    
    // Clear state on runId change
    setEvents([]);
    setScreenshot(null);
    setStatus("unknown");

    const ws = new WebSocket(webpilotSocketUrl(runId, getAccessToken()));

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (err) => console.error("WebPilot WS Error:", err);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "screenshot") {
          setScreenshot(`data:image/jpeg;base64,${msg.payload.imageBase64}`);
        } else if (msg.type === "run_status") {
          setStatus(msg.payload.state);
        } else {
          // Stamp arrival time so the log shows when each line came in.
          setEvents((prev) => [...prev, { ...msg, receivedAt: Date.now() }]);
        }
      } catch (e) {
        console.error("Failed to parse WS msg", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [runId]);

  return { events, screenshot, status, connected };
}
