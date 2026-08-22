// src/app/api/status/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/* Public status endpoint.

   SECURITY: this returns a verdict and nothing else. No error text,
   no stack traces, no hostnames, no versions, no counts. If a check
   throws, the detail goes to the server log and the response says
   only that the component is degraded. An attacker learns that the
   database is up, which they would learn anyway by loading any page
   that reads from it.

   Checks are read-only and cached, so this cannot be used to put
   load on the database. */

export const dynamic = "force-dynamic";

type State = "operational" | "degraded" | "down";

type Snapshot = {
  overall: State;
  components: { id: string; state: State }[];
  incident: { active: boolean; severity: string; title: string; body: string; startedAt: string | null } | null;
  checkedAt: string;
};

/* Cached in module scope so a burst of requests produces one check.
   Resets on deploy, which is fine. */
let cache: { at: number; data: Snapshot } | null = null;
const TTL_MS = 30_000;

/* Rate limit is generous, since this is a page people refresh during
   an outage. It exists to stop scripted hammering, not real use. */
const hits = new Map<string, number[]>();
const RL_WINDOW = 60_000;
const RL_MAX = 30;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < RL_WINDOW);
  if (recent.length >= RL_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

/* A check that takes too long is a degraded check, not a hung request. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function checkDatabase(): Promise<{ state: State; db: any | null }> {
  try {
    const client = await withTimeout(clientPromise, 4000);
    const db = client.db(process.env.MONGODB_DB);
    const started = Date.now();
    await withTimeout(db.command({ ping: 1 }), 4000);
    const elapsed = Date.now() - started;
    /* A ping that takes over a second means something is wrong even
       though it succeeded. */
    return { state: elapsed > 1500 ? "degraded" : "operational", db };
  } catch (e) {
    console.error("[status] database check failed", e);
    return { state: "down", db: null };
  }
}

async function checkShipments(db: any | null): Promise<State> {
  if (!db) return "down";
  try {
    const started = Date.now();
    /* estimatedDocumentCount reads collection metadata rather than
       scanning documents, so this stays cheap regardless of size. */
    await withTimeout(db.collection("shipments").estimatedDocumentCount(), 4000);
    return Date.now() - started > 2000 ? "degraded" : "operational";
  } catch (e) {
    console.error("[status] shipments check failed", e);
    return "down";
  }
}

function checkEmail(): State {
  /* We do not send a probe email on every status check, as that would
     burn quota and create noise. Presence of configuration is what we
     can verify cheaply; genuine delivery failures surface through the
     incident notice instead. */
  return process.env.RESEND_API_KEY ? "operational" : "degraded";
}

async function readIncident(db: any | null) {
  if (!db) return null;
  try {
    const doc: any = await withTimeout(
      db.collection("app_settings").findOne({ _id: "status_incident" as any }),
      3000
    );
    if (!doc?.active) return null;
    return {
      active: true,
      severity: ["investigating", "identified", "monitoring", "maintenance"].includes(String(doc.severity))
        ? String(doc.severity)
        : "investigating",
      title: String(doc.title || "").slice(0, 200),
      body: String(doc.body || "").slice(0, 1000),
      startedAt: doc.startedAt ? new Date(doc.startedAt).toISOString() : null,
    };
  } catch {
    return null;
  }
}

function worst(states: State[]): State {
  if (states.includes("down")) return "down";
  if (states.includes("degraded")) return "degraded";
  return "operational";
}

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const { state: dbState, db } = await checkDatabase();
  const [shipmentsState, incident] = await Promise.all([
    checkShipments(db),
    readIncident(db),
  ]);
  const emailState = checkEmail();

  /* The website itself is operational by definition: this response
     is being served. */
  const components = [
    { id: "website", state: "operational" as State },
    { id: "tracking", state: worst([dbState, shipmentsState]) },
    { id: "notifications", state: emailState },
  ];

  const data: Snapshot = {
    overall: worst(components.map(c => c.state)),
    components,
    incident,
    checkedAt: new Date().toISOString(),
  };

  cache = { at: Date.now(), data };
  return NextResponse.json(data);
}