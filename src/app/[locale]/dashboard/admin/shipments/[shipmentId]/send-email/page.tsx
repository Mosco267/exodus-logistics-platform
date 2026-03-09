"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminShipmentSendEmailPage() {
  const params = useParams();
  const router = useRouter();

  const locale = String(params?.locale || "en");
  const shipmentId = String(params?.shipmentId || "").trim();

  const [recipientType, setRecipientType] = useState<"receiver" | "sender">("receiver");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    setOk("");
    setErr("");

    if (!subject.trim()) {
      setErr("Subject is required.");
      return;
    }

    if (!message.trim()) {
      setErr("Message is required.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType,
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to send email.");
      }

      setOk("Email sent successfully.");
      setMessage("");
      setSubject("");
      setEmail("");
    } catch (e: any) {
      setErr(e?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/dashboard/admin/shipments`)}
          className="inline-flex items-center text-sm font-semibold text-gray-700 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to shipments
        </button>

        <div className="mt-4 rounded-3xl border border-gray-200 bg-white shadow-xl p-6">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-700" />
            <h1 className="text-2xl font-extrabold text-gray-900">
              Send Email • {shipmentId}
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            By default, the email goes to the receiver. You can switch to sender or enter another email manually.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Send to</label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as "receiver" | "sender")}
                className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white"
              >
                <option value="receiver">Receiver email</option>
                <option value="sender">Sender email</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Custom email (optional)
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Leave empty to use sender/receiver email"
                className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                placeholder="Type your email message here..."
              />
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="mt-6 w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center hover:bg-blue-700 disabled:opacity-60"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" />
                Send Email
              </>
            )}
          </button>

          {err && (
            <div className="mt-4 flex items-center text-red-600 font-semibold">
              <AlertCircle className="w-5 h-5 mr-2" />
              {err}
            </div>
          )}

          {ok && (
            <div className="mt-4 flex items-center text-green-700 font-semibold">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {ok}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}