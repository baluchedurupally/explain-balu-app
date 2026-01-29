/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ---- CORS headers ----
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://explain.balu.app",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // ---- Preflight ----
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ---- Route: create-order (stub) ----
    if (url.pathname === "/create-order" && request.method === "POST") {
      return new Response(JSON.stringify({
        orderId: "order_stub_123",
        amount: 500,
        currency: "INR",
        keyId: "rzp_test_stub"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ---- Route: verify-payment (stub) ----
    if (url.pathname === "/verify-payment" && request.method === "POST") {
      return new Response(JSON.stringify({
        paymentToken: "token_stub_paid"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ---- Route: process-doc (stub) ----
    if (url.pathname === "/process-doc" && request.method === "POST") {
      const result = {
        what: "This appears to be an official document or notice. (Stub response)",
        seriousness: {
          level: "Low",
          text: "This document is informational and does not indicate urgency. (Stub)"
        },
        next: "No immediate action is required based on this document. (Stub)",
        noWorry: "This does not indicate a legal case or penalty. (Stub)"
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ---- Fallback ----
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};

