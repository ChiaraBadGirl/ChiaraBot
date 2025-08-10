// paypalWebhookRouter.js — isolierter Router für PayPal Webhooks (LIVE/SANDBOX)
import express from "express";

const router = express.Router();

// Nur auf diesen Routen: RAW-Body notwendig für die Signaturprüfung
const raw = express.raw({ type: "application/json" });

const ENV = (process.env.PAYPAL_ENVIRONMENT || "live").toLowerCase(); // "live" | "sandbox"
const PAYPAL_API_BASE = ENV === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";

function pretty(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

// GET-Checks für Monitoring
router.get("/webhook/paypal", (_req, res) => res.status(200).send("✅ PayPal Webhook Endpoint OK (GET)"));
router.get("/paypal/webhook", (_req, res) => res.status(200).send("✅ PayPal Webhook Alias OK (GET)"));

// Signatur prüfen (v2 Verify API)
async function verifyPaypalSignature(headers, rawBody) {
  if (!PAYPAL_WEBHOOK_ID) {
    console.warn("⚠️ PAYPAL_WEBHOOK_ID fehlt — Signaturprüfung wird übersprungen.");
    return true;
  }
  try {
    const transmission_id   = headers["paypal-transmission-id"];
    const transmission_time = headers["paypal-transmission-time"];
    const cert_url          = headers["paypal-cert-url"];
    const auth_algo         = headers["paypal-auth-algo"];
    const transmission_sig  = headers["paypal-transmission-sig"];
    const eventObj = JSON.parse(rawBody || "{}");

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const resp = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
      body: JSON.stringify({
        auth_algo,
        cert_url,
        transmission_id,
        transmission_sig,
        transmission_time,
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: eventObj
      })
    });
    const data = await resp.json().catch(() => ({}));
    const ok = data?.verification_status === "SUCCESS";
    console.log(`🔎 Verify: ${resp.status} — ${data?.verification_status}`);
    if (!ok) console.log("🔎 Verify Response:", pretty(data));
    return ok;
  } catch (e) {
    console.error("❌ verifyPaypalSignature Fehler:", e?.message || e);
    return false;
  }
}

// Gemeinsamer Handler (beide POST-Routen nutzen denselben Code)
async function handleWebhook(req, res) {
  // Sofort ack für PayPal
  res.status(200).end();

  setImmediate(async () => {
    try {
      const rawBody = req.body?.toString?.("utf8") || "";
      const headers = req.headers || {};
      console.log(`📩 Webhook HIT ${req.path} @ ${new Date().toISOString()}`);
      console.log("Headers:", pretty(headers));
      console.log("Body RAW:", rawBody);

      const valid = await verifyPaypalSignature(headers, rawBody);
      console.log("🧾 Signatur gültig?", valid);
      if (!valid) return;

      const evt = JSON.parse(rawBody || "{}");
      const type = evt?.event_type || evt?.resource_type || "UNKNOWN";

      if (type === "CHECKOUT.ORDER.APPROVED") {
        console.log("ℹ️ Event: CHECKOUT.ORDER.APPROVED");
        // kein Fulfillment hier – das macht /paypal/return in deinem Flow
        return;
      }

      if (type === "PAYMENT.CAPTURE.COMPLETED") {
        const capId = evt?.resource?.id;
        const customId = evt?.resource?.custom_id; // Telegram-ID
        const amount = evt?.resource?.amount;
        console.log(`💸 CAPTURE COMPLETED: ${capId} — User ${customId} — ${amount?.value} ${amount?.currency_code}`);
        // Optional: Idempotenz in DB markieren oder hier (zusätzlich) fulfillen
        return;
      }

      console.log("ℹ️ Unbehandeltes Event:", type);
    } catch (e) {
      console.error("❌ Webhook async error:", e?.message || e);
    }
  });
}

router.post("/webhook/paypal", raw, handleWebhook);
router.post("/paypal/webhook", raw, handleWebhook);

export default router;
