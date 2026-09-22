import { createOpenAI } from "@ai-sdk/openai";

export function crearModeloLovable() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Falta LOVABLE_API_KEY");

  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  return lovable.responses("openai/gpt-6-astra");
}

export const opcionesRazonamiento = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    store: false,
  },
} as const;
