const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast"; // supports JSON mode :contentReference[oaicite:2]{index=2}

function resolveLanguage(code) {
  const map = {
    en: "English",
    te: "Telugu",
    hi: "Hindi",
    ta: "Tamil"
  };
  return map[code] || "English";
}

function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://explain.balu.app",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    // ✅ LLM-powered explanation
    if (url.pathname === "/process-doc" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch {}

      const paymentToken = body.paymentToken || body.token || "";
      const text = (body.text || "").trim();
      const outputLangCode = (body.outputLanguage || "en").trim();
	  const outputLanguage = resolveLanguage(outputLangCode);
      const category = (body.category || "auto").trim();

      // For now: minimal check; later we’ll verify real payments
      if (!paymentToken) return json({ error: "Missing payment token" }, 401, corsHeaders);
      if (!text) return json({ error: "No document text provided (OCR coming next)." }, 400, corsHeaders);

      const schema = {
        type: "object",
        properties: {
          what: { type: "string" },
          seriousness: {
            type: "object",
            properties: {
              level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
              text: { type: "string" }
            },
            required: ["level", "text"]
          },
          next: { type: "string" },
          noWorry: { type: "string" }
        },
        required: ["what", "seriousness", "next", "noWorry"]
      };

      const system = `You are "Explain Docs", a careful assistant that simplifies documents.
Rules:
- Output MUST follow the JSON schema exactly.
- Be conservative: if uncertain, say so.
- No legal/medical/financial advice. Suggest consulting the issuing org/professional.
- Keep it short, clear, and actionable.
- Output language: ${outputLanguage}
- Category hint: ${category}`;

      const user = `Document text:
"""${text}"""`;

      try {
        const aiResp = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ],
          response_format: {
            type: "json_schema",
            json_schema: schema
          }
        });

        // Workers AI returns { response: { ...your json... } } in JSON mode examples :contentReference[oaicite:3]{index=3}
        const result = aiResp?.response ?? aiResp;

        return json(result, 200, corsHeaders);
      } catch (e) {
        // JSON Mode can fail (“JSON Mode couldn't be met”), so we must handle it :contentReference[oaicite:4]{index=4}
        return json(
          {
            what: "I couldn’t reliably format the explanation this time.",
            seriousness: { level: "LOW", text: "This looks like a formatting/processing issue, not your document." },
            next: "Please try again. If it repeats, paste a shorter excerpt (top section + key numbers/dates).",
            noWorry: "Your upload/payment is not the problem. This is a temporary processing limitation."
          },
          200,
          corsHeaders
        );
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};