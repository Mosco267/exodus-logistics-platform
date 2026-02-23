// src/lib/id.ts
import crypto from "crypto";

export function alpha2(code: string) {
  return (code || "XX").toUpperCase().slice(0, 2);
}

export function generateTrackingNumber(originCountryCode: string) {
  const prefix = "EX";
  const yy = String(new Date().getFullYear()).slice(-2);
  const cc = alpha2(originCountryCode);

  const digits = crypto.randomInt(0, 10_000_000).toString().padStart(7, "0");
  const letter = String.fromCharCode(65 + crypto.randomInt(0, 26)); // A-Z

  return `${prefix}${yy}${cc}${digits}${letter}`;
}

export function generateShipmentId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const hex = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
  return `EXS-${yy}${mm}${dd}-${hex}`;
}