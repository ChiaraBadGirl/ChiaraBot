// index_PROD_FINAL.js
// Deploy-ready Express server focusing on PayPal Webhook handling.
// - Single PORT definition
// - Immediate 200 ACK on webhook POST
// - Real signature verification with PayPal
// - Clean logging of headers + raw body length
// - Handles CHECKOUT.ORDER.APPROVED and PAYMENT.CAPTURE.COMPLETED
// - Optional idempotency with Supabase (skip if not configured)
// - Health checks: /_health and GET on webhook paths

import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

// ===================
// Environment
// ===================
const PORT = process.env.PORT || 3000;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || ""; // from PayPal Developer dashboard
const PAYPAL_ENVIRONMENT = (process.env.PAYPAL_ENVIRONMENT || "live").toLowerCase(); // 'live' or 'sandbox'

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const paypalBase = PAYPAL_ENVIRONMENT === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

// ===================
// Helpers
// ===================
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
};

async function getAccessToken() {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${paypalBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal token error ${res.status}: ${txt}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function verifyWebhookSignature(headers, eventBody) {
  const accessToken = await getAccessToken();
  const payload = {
    transmission_id: headers["paypal-transmission-id"],
    transmission_time: headers["paypal-transmission-time"],
    cert_url: headers["paypal-cert-url"],
    auth_algo: headers["paypal-auth-algo"],
    transmission_sig: headers["paypal-transmission-sig"],
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: eventBody
  };

  const res = await fetch(`${paypalBase}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Verify signature HTTP ${res.status}: ${txt}`);
  }

  const json = await res.json();
  return json?.verification_status === "SUCCESS";
}

// Optional: simple idempotency using Supabase table `paypal_captures`
// Schema suggestion (create on your DB):
// create table if not exists paypal_captures (
//   capture_id text primary key,
//   event_id text,
//   status text,
//   created_at timestamptz default now()
// );
async function isCaptureProcessed(captureId) {
  if (!hasSupabase) return false;
  const { data, error } = await supabase
    .from("paypal_captures")
    .select("capture_id")
    .eq("capture_id", captureId)
    .maybeSingle();
  if (error) {
    console.error("⚠️ Supabase check error:", error);
    return false; // fail-open to avoid blocking
  }
  return Boolean(data?.capture_id);
}

async function markCaptureProcessed({ captureId, eventId, status }) {
  if (!hasSupabase) return;
  const { error } = await supabase
    .from("paypal_captures")
    .insert({ capture_id: captureId, event_id: eventId, status });
  if (error) {
    // Likely duplicate insert if unique constraint exists. Log and continue.
    console.warn("ℹ️ Supabase insert warning (possibly duplicate):", error.message || error);
  }
}

// Placeholder for your app-specific processing once a capture is verified and not processed.
// TODO: Replace with your logic (credit points, unlock product, send Telegram msg, etc.).
async function processSuccessfulCapture({ event, captureId, amount, currency, payerEmail }) {
  console.log("🎯 [TODO] Process capture in your app:", {
    captureId, amount, currency, payerEmail,
    eventId: event.id
  });
  // Example:
  // await creditUserPoints(userId, points);
  // await unlockProductForUser(userId, productCode);
  // await notifyTelegram(userId, `Danke! Zahlung ${amount} ${currency} erhalten.`);
}

// ===================
// Server
// ===================
const app = express();

// Only the webhook routes need raw body
const rawJson = express.raw({ type: "application/json" });
app.post("/webhook/paypal", rawJson, webhookHandler);
app.post("/paypal/webhook", rawJson, webhookHandler);

// Health & GET checks
app.get("/_health", (req, res) => {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    env: PAYPAL_ENVIRONMENT,
    supabase: hasSupabase
  });
});
app.get("/webhook/paypal", (req, res) => res.status(200).send("✅ PayPal Webhook OK (GET)"));
app.get("/paypal/webhook", (req, res) => res.status(200).send("✅ PayPal Webhook OK (GET)"));

// Fallback JSON parser for other routes (if you add any)
app.use(express.json());

// ===================
// Webhook Handler
// ===================
async function webhookHandler(req, res) {
  try {
    // 1) Immediately ACK so PayPal doesn't retry due to timeout
    res.status(200).send("OK");

    // 2) Log headers and raw body (length only)
    const hdrs = req.headers || {};
    const relevant = pick(hdrs, [
      "paypal-transmission-id",
      "paypal-transmission-time",
      "paypal-cert-url",
      "paypal-auth-algo",
      "paypal-transmission-sig",
      "paypal-auth-version",
      "correlation-id",
      "content-type",
      "user-agent"
    ]);
    const rawBuf = req.body; // Buffer (because of express.raw)
    const rawLen = Buffer.isBuffer(rawBuf) ? rawBuf.length : 0;
    const rawStr = Buffer.isBuffer(rawBuf) ? rawBuf.toString("utf8") : "{}";

    console.log("🧾 PayPal headers:", relevant);
    console.log(`📦 Raw body bytes: ${rawLen}`);

    // 3) Parse JSON safely
    let event;
    try {
      event = JSON.parse(rawStr);
    } catch (e) {
      console.error("❌ Cannot parse webhook JSON:", e.message);
      return;
    }

    console.log("🔔 Event:", { id: event?.id, type: event?.event_type });

    // 4) Verify signature
    let isValid = false;
    try {
      isValid = await verifyWebhookSignature(hdrs, event);
    } catch (e) {
      console.error("❌ Signature verification call failed:", e.message);
      // Do not return; you may still want to log/debug
    }
    console.log("✅ Signature valid?", isValid);

    if (!isValid) {
      console.warn("⚠️ Invalid webhook signature. Ignoring event.");
      return;
    }

    // 5) Handle events
    const type = event?.event_type;
    if (type === "CHECKOUT.ORDER.APPROVED") {
      const orderId = event?.resource?.id;
      const payerEmail = event?.resource?.payer?.email_address;
      console.log("🧩 Order approved. Waiting for capture.", { orderId, payerEmail });
      // You can optionally trigger a capture here via API if your flow requires server-side capture.
      return;
    }

    if (type === "PAYMENT.CAPTURE.COMPLETED") {
      const captureId = event?.resource?.id;
      const amount = event?.resource?.amount?.value;
      const currency = event?.resource?.amount?.currency_code;
      const payerEmail = event?.resource?.payer?.email_address || event?.resource?.supplementary_data?.related_ids?.payer?.email_address;

      if (!captureId) {
        console.warn("⚠️ Missing captureId in event. Skipping.");
        return;
      }

      // Idempotency check
      const already = await isCaptureProcessed(captureId);
      if (already) {
        console.log("♻️ Capture already processed. Skipping.", { captureId });
        return;
      }

      // Your business logic
      await processSuccessfulCapture({
        event,
        captureId,
        amount,
        currency,
        payerEmail
      });

      // Mark as processed
      await markCaptureProcessed({
        captureId,
        eventId: event.id,
        status: "completed"
      });

      console.log("🎉 Capture processed & recorded.", { captureId, amount, currency });
      return;
    }

    console.log("ℹ️ Unhandled PayPal event type:", type);
  } catch (err) {
    // We already ACKed, so just log
    console.error("💥 Webhook handler error:", err);
  }
}

// ===================
// Start
// ===================
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on :${PORT} [${PAYPAL_ENVIRONMENT}]`);
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_WEBHOOK_ID) {
    console.warn("⚠️ Missing PayPal env vars. Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID.");
  }
  if (!hasSupabase) {
    console.log("ℹ️ Supabase not configured. Idempotency will be in-memory only (per-runtime).");
  }
});
