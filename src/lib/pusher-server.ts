// src/lib/pusher-server.ts
import Pusher from "pusher";

declare global {
  // eslint-disable-next-line no-var
  var _pusherServer: Pusher | undefined;
}

function getPusherServer(): Pusher {
  if (global._pusherServer) return global._pusherServer;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    throw new Error(
      "Pusher environment variables missing. Set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER."
    );
  }

  const instance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  global._pusherServer = instance;
  return instance;
}

export const pusherServer = new Proxy({} as Pusher, {
  get(_target, prop) {
    const instance = getPusherServer();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

// ─── Channel name helpers ──────────────────────────────────────
// Per-user private chat channel
export const userChatChannel = (userId: string) => `private-chat-${userId}`;

// Admin presence channel (admin online status)
export const adminPresenceChannel = () => `presence-admin`;

// Global admin event channel (for new ticket notifications etc.)
export const adminEventsChannel = () => `private-admin-events`;