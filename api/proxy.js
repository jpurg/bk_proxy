export default async function handler(req, res) {
  try {
    // Health check in browser
    if (req.method === "GET") {
      return res.status(200).send("ok");
    }

    const started = Date.now();

    // Read raw body (Twilio posts x-www-form-urlencoded)
    const rawBody = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const contentType = req.headers["content-type"] || "application/x-www-form-urlencoded";
    const targetUrl = process.env.TARGET_URL || "https://onyx-bot.biocoded.com/bot/button/trigger";
    const authToken = process.env.BOT_AUTH_TOKEN;

    console.log("Incoming webhook", {
      method: req.method,
      contentType,
      bodyLen: rawBody.length,
      targetUrl
    });

    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": contentType
      },
      body: rawBody
    });

    const text = await resp.text();

    console.log("Forwarded", { status: resp.status, elapsed_ms: Date.now() - started });
    res.status(resp.status).send(text);
  } catch (e) {
    console.error("Proxy error:", e?.message || e);
    res.status(500).send("Proxy failed");
  }
}