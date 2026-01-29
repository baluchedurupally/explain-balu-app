const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

function resolveLanguage(code) {
  const map = { en: "English", te: "Telugu", hi: "Hindi", ta: "Tamil" };
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

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ----------------------------
    // LLM-powered document explain
    // ----------------------------
    if (url.pathname === "/process-doc" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch {}

      const paymentToken = (body.paymentToken || "").trim();
      const text = (body.text || "").trim();
      const outputLangCode = (body.outputLanguage || "en").trim();
      const outputLanguage = resolveLanguage(outputLangCode);
      const category = (body.category || "auto").trim();

      if (!paymentToken) {
        return json({ error: "Missing payment token" }, 401, corsHeaders);
      }
      if (!text) {
        return json(
          { error: "No document text provided. (OCR not enabled yet.)" },
          400,
          corsHeaders
        );
      }

      // ✅ Debug visibility (temporary)
      console.log("AI binding exists:", !!env.AI);
      console.log("Requested language:", outputLangCode, "=>", outputLanguage);

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
You are an explanation service, not an advisor.

Your job is to explain what a document says in simple, everyday language.
You must NOT give legal, medical, financial, or professional advice.

STRICT RULES (must follow all):
- Explain ONLY what is explicitly written in the document.
- Do NOT add new facts, assumptions, interpretations, or guesses.
- Do NOT infer intent, deadlines, penalties, or consequences unless they are clearly stated.
- If something is unclear or missing, say exactly:
  “The document does not clearly say.”
- Do NOT tell the user what they should do beyond what the document itself states.
- Do NOT reassure or dismiss concerns unless the document explicitly does so.
- Use simple language suitable for a non-technical reader.
- Be calm, neutral, and factual.

SERIOUSNESS CLASSIFICATION (based ONLY on text):
- LOW: Informational only. No action, deadlines, penalties, or consequences mentioned.
- MEDIUM: Action is requested or recommended, or a possible consequence is mentioned
  (e.g., holds, suspension, fees), but no legal enforcement or deadlines.
- HIGH: Legal action, court, fines, enforcement, eviction, or strict deadlines are clearly stated.

SECTION-SPECIFIC RULES:
1) What this document is:
   - Summarize in 1–2 sentences.
   - Include key amounts, dates, or warnings ONLY if written in the document.

2) How serious it is:
   - Choose LOW, MEDIUM, or HIGH.
   - Give one sentence explaining why, using the document’s words.

3) What you should do next:
   - State only what the document explicitly asks or suggests.
   - If the document does not clearly state next steps, say:
     “The document does not clearly say what action to take.”

4) What this does NOT mean:
   - List things the document does NOT say (e.g., no court action mentioned).
   - Do NOT say “nothing to worry about.”
   - If unsure, say:
     “The document does not clearly say.”

LANGUAGE RULES:
- Always respond fully in the requested output language.
- Do not mix languages.
- If the document language differs, translate and explain in the requested language.

OUTPUT FORMAT:
- You MUST follow the provided JSON schema exactly.
- Do not include extra fields, commentary, or explanations outside the schema.

Output language: ${outputLanguage}
Category hint: ${category}

Return JSON exactly matching the schema.`;

      const user = `Document text:
"""${text}"""`;

      try {
        if (!env.AI) {
          // If AI binding isn't available, return a clear error
          return json({ error: "Workers AI binding not configured." }, 500, corsHeaders);
        }

        const aiResp = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ],
          response_format: { type: "json_schema", json_schema: schema }
        });

        const result = aiResp?.response ?? aiResp;
        return json(result, 200, corsHeaders);
      } catch (e) {
        console.log("AI error:", e?.message || String(e));
        return json(
          {
            what: "The document was received, but an AI formatting error occurred.",
            seriousness: { level: "LOW", text: "The document does not clearly say anything urgent here." },
            next: "Please try again with a shorter excerpt (top section + key numbers/dates).",
            noWorry: "This is a processing issue. The document does not clearly say more in the excerpt provided."
          },
          200,
          corsHeaders
        );
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};
