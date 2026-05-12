// src/lib/pusher-client.ts
"use client";

import PusherClient from "pusher-js";

declare global {
  // eslint-disable-next-line no-var
  var _pusherClient: PusherClient | undefined;
}

/**
 * Returns a singleton Pusher client.
 * Auth is via /api/support/pusher-auth (handles both private and presence channels).
 */
export function getPusherClient(): PusherClient {
  if (typeof window === "undefined") {
    // Avoid touching Pusher on the server during SSR
    return null as any;
  }

  if (window._pusherClient) return window._pusherClient as unknown as PusherClient;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    console.error(
      "Pusher client env vars missing. Set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER."
    );
    return null as any;
  }

  const client = new PusherClient(key, {
    cluster,
    authEndpoint: "/api/support/pusher-auth",
    auth: { headers: { "Content-Type": "application/json" } },
    enabledTransports: ["ws", "wss"],
  });

  (window as any)._pusherClient = client;
  return client;
}

// ─── Channel name helpers (must match server) ──────────────────
export const userChatChannel = (userId: string) => `private-chat-${userId}`;
export const adminPresenceChannel = () => `presence-admin`;
export const adminEventsChannel = () => `private-admin-events`;