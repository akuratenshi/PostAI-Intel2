export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("API key exists:", !!apiKey);
  
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { prompt, maxTokens = 1000 } = req.body;
    console.log("Prompt received:", !!prompt);
    
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    console.log("Calling Anthropic...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    console.log("Anthropic status:", response.status);
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Anthropic error:", JSON.stringify(err));
      return res.status(response.status).json({ error: err.error?.message ?? "Anthropic error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    return res.status(200).json({ text });
  } catch (err) {
    console.error("generate error:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
