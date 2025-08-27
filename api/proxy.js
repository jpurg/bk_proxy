export default async function handler(req, res) {
  try {
    // 1) Read raw body (Twilio posts x-www-form-urlencoded)
    const rawBody = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const contentType =
      req.headers["content-type"] || "application/x-www-form-urlencoded";

    // 2) Forward to your real webhook
    const targetUrl =
      process.env.TARGET_URL ||
      "https://onyx-bot.biocoded.com/bot/button/trigger";

    const authToken = process.env.BOT_AUTH_TOKEN; // set this in Vercel env

    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": contentType
      },
      body: rawBody
    });

    const text = await resp.text();
    res.status(resp.status).send(text);
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(500).send("Proxy failed");
  }
}