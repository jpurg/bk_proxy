// api/proxy.js
import { Agent } from "undici"; // built-in with Node 18+/Vercel

// Insecure agent for JUST the bad-cert host
const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    // Health check (GET)
    if (req.method === "GET") return res.status(200).send("ok");

    // Read raw body (Twilio posts application/x-www-form-urlencoded)
    const rawBody = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const contentType =
      req.headers["content-type"] || "application/x-www-form-urlencoded";

    const targetUrl =
      process.env.TARGET_URL ||
      "https://onyx-bot.biocoded.com/bot/button/trigger";

    const authToken = process.env.BOT_AUTH_TOKEN;

    // Use insecure agent ONLY for the onyx-bot host
    let fetchOptions = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": contentType
      },
      body: rawBody
    };

    try {
      const { hostname } = new URL(targetUrl);
      if (hostname === "onyx-bot.biocoded.com") {
        fetchOptions.dispatcher = insecureAgent; // like curl -k, scoped
      }
    } catch {
      // if URL parsing fails, just fall back to normal fetch
    }

    // (Optional) brief logs to Vercel runtime
    console.log("Incoming webhook", {
      contentType,
      bodyLen: rawBody.length,
      targetUrl
    });

    const resp = await fetch(targetUrl, fetchOptions);
    const text = await resp.text();

    console.log("Forwarded", { status: resp.status });
    return res.status(resp.status).send(text);
  } catch (e) {
    console.error("Proxy error:", e?.message || e);
    return res.status(500).send("Proxy failed");
  }
}
