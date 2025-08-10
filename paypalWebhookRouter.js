// paypalWebhookRouter.js
import express from "express";

const router = express.Router();

const PAYPAL_DEBUG_WEBHOOK = (process.env.PAYPAL_DEBUG_WEBHOOK === "true" || process.env.PAYPAL_DEBUG_WEBHOOK === "1");
const PAYPAL_ENVIRONMENT = process.env.PAYPAL_ENVIRONMENT === "sandbox" ? "sandbox" : "live";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";

const PAYPAL_API_BASE = PAYPAL_ENVIRONMENT === "live"
  ? "https://api.paypal.com"
  : "https://api.sandbox.paypal.com";

// GET health for both paths
router.get("/webhook/paypal", (req, res) => res.status(200).send("✅ PayPal Webhook Endpoint OK (GET)"));
router.get("/paypal/webhook", (req, res) => res.status(200).send("✅ PayPal Webhook Alias OK (GET)"));

// Route-specific RAW body
const paypalRaw = express.raw({ type: "application/json" });

async function verifyPaypalSignatureRAW(req, rawBody) {
  try {
    if (PAYPAL_DEBUG_WEBHOOK) {
      console.log("⚠️ DEBUG_BYPASS aktiv – Signatur wird nicht geprüft.");
      return { ok: true, data: { verification_status: "DEBUG_BYPASS" } };
    }
    if (!PAYPAL_WEBHOOK_ID || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.warn("⚠️ Fehlende ENV (PAYPAL_WEBHOOK_ID/CLIENT_ID/SECRET).");
      return { ok: false, data: { reason: "missing_env" } };
    }
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const eventObj = JSON.parse(rawBody);
    const resp = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
      body: JSON.stringify({
        transmission_id: req.headers["paypal-transmission-id"],
        transmission_time: req.headers["paypal-transmission-time"],
        cert_url: req.headers["paypal-cert-url"],
        auth_algo: req.headers["paypal-auth-algo"],
        transmission_sig: req.headers["paypal-transmission-sig"],
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: eventObj
      })
    });
    const data = await resp.json();
    const ok = data?.verification_status === "SUCCESS";
    console.log("🔎 Verify status:", resp.status, "resp:", data);
    return { ok, data };
  } catch (e) {
    console.error("❌ verifyPaypalSignatureRAW Fehler:", e);
    return { ok: false, data: { error: String(e) } };
  }
}

async function handler(req, res) {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : (typeof req.body === "string" ? req.body : "");
    console.log(`📩 Webhook HIT ${req.path} @ ${new Date().toISOString()}`);
    console.log("Headers:", req.headers);
    console.log("Body RAW:", raw);

    let validResult = await verifyPaypalSignatureRAW(req, raw);
    console.log("🧾 Signatur gültig?", validResult.ok);

    if (!validResult.ok) {
      return res.status(200).send("IGNORED_INVALID_SIGNATURE");
    }

    const event = JSON.parse(raw);
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      console.log("💸 PAYMENT.CAPTURE.COMPLETED:", event?.resource?.id);
      // TODO: fulfillOrder(...) aufrufen
    } else {
      console.log("ℹ️ Event:", event.event_type);
    }
    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Fehler im Webhook-Handler:", err);
    return res.status(200).send("IGNORED_HANDLER_ERROR");
  }
}

// POST routes with raw middleware
router.post("/webhook/paypal", paypalRaw, handler);
router.post("/paypal/webhook", paypalRaw, handler);

export default router;
