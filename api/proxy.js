// api/proxy.js
export default async function handler(req, res) {
  try {
    // Health check
    if (req.method === "GET") return res.status(200).send("ok");

    // Read raw body (Twilio posts x-www-form-urlencoded)
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

    console.log("Incoming webhook", {
      contentType,
      bodyLen: rawBody.length,
      targetUrl
    });

    // Disable TLS verification ONLY for the onyx-bot host (curl -k behavior)
    let prevTls;
    try {
      const { hostname } = new URL(targetUrl);
      if (hostname === "onyx-bot.biocoded.com") {
        prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      const resp = await fetch(targetUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": contentType
        },
        body: rawBody
      });

      const text = await resp.text();
      console.log("Forwarded", { status: resp.status });
      return res.status(resp.status).send(text);
    } finally {
      if (prevTls !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
      }
    }
  } catch (e) {
    console.error("Proxy error:", e?.message || e);
    return res.status(500).send("Proxy failed");
  }
}
