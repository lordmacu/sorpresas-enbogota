import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Crawlers de motores de IA / LLMs a los que damos la bienvenida explícita
// (ChatGPT/OpenAI, Claude/Anthropic, Perplexity, Google AI, Apple, etc.).
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "Meta-ExternalAgent",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Permite indexación y entrenamiento/recuperación por motores de IA.
      { userAgent: AI_BOTS, allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
