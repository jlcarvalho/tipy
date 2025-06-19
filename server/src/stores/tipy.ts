import "dotenv/config";

import { MDocument } from "@mastra/rag";
import { PgVector } from "@mastra/pg";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import TurndownService from "turndown";

// Zendesk Help Center API configuration
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN!; // e.g., 'tipspace'
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL!;
const ZENDESK_API_TOKEN = process.env.ZENDESK_API_TOKEN!;

const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

// Initialize the vector store with error handling
try {
  await pgVector.createIndex({
    indexName: "tipy",
    dimension: 1536,
  });
  console.log("✅ Vector index 'tipy' created successfully in store");
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.warn("⚠️ Failed to create vector index in store:", errorMessage);
  console.warn(
    "To fix this, increase your PostgreSQL maintenance_work_mem setting to at least 64MB."
  );
  console.warn("Continuing with data ingestion...");
}

await pgVector.truncateIndex({ indexName: "tipy" });

// Function to fetch articles from Zendesk Help Center API
async function fetchZendeskArticles() {
  const articles: any[] = [];
  const locale = "pt-br"; // Portuguese Brazil locale
  let endpoint = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/help_center/${locale}/articles.json`;

  const auth = Buffer.from(
    `${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`
  ).toString("base64");

  while (endpoint) {
    try {
      console.log(`📡 Fetching articles from: ${endpoint}`);

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch articles: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.articles) {
        articles.push(...data.articles);
        console.log(
          `📄 Fetched ${data.articles.length} articles from this page`
        );
      }

      // Get next page URL for pagination
      endpoint = data.next_page;

      // Add a small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error fetching articles from ${endpoint}:`, error);
      break;
    }
  }

  return articles;
}

// Function to convert HTML to markdown using Turndown library
function htmlToMarkdown(html: string): string {
  if (!html) return "";

  const turndownService = new TurndownService({
    headingStyle: "atx", // Use # for headings
    bulletListMarker: "-", // Use - for bullet points
    codeBlockStyle: "fenced", // Use ``` for code blocks
    emDelimiter: "*", // Use * for emphasis
    strongDelimiter: "**", // Use ** for strong
  });

  return turndownService.turndown(html);
}

// Fetch and process articles
const articles = await fetchZendeskArticles();
console.log(`📚 Total articles fetched: ${articles.length}`);

for (const article of articles) {
  try {
    if (!article.body || article.body.trim() === "") {
      console.log(`⏭️ Skipping article ${article.id} - empty body`);
      continue;
    }

    // Convert title and body to markdown
    const title = article.title || "Untitled";
    const markdownBody = htmlToMarkdown(article.body);

    if (!markdownBody || markdownBody.trim() === "") {
      console.log(
        `⏭️ Skipping article ${article.id} - no content after HTML conversion`
      );
      continue;
    }

    // Combine title and body as markdown
    const fullMarkdown = `# ${title}\n\n${markdownBody}`;

    const document = MDocument.fromMarkdown(fullMarkdown);

    const chunks = await document.chunk({
      strategy: "markdown",
      size: 512,
      overlap: 100,
    });

    if (chunks.length === 0) {
      console.log(`⏭️ Skipping article ${article.id} - no chunks generated`);
      continue;
    }

    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks.map((chunk) => chunk.text),
    });

    await pgVector.upsert({
      indexName: "tipy",
      vectors: embeddings,
      metadata: chunks.map((chunk) => ({
        text: chunk.text,
        source:
          article.html_url ||
          `https://${ZENDESK_SUBDOMAIN}.zendesk.com/hc/pt-br/articles/${article.id}`,
        article_id: article.id,
        article_title: title,
      })),
    });

    console.log(
      `✅ Article ${article.id} ("${title}") processed successfully!`
    );

    await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay between articles
  } catch (error) {
    console.error(`❌ Error processing article ${article.id}:`, error);
  }
}

console.log("🎉 Knowledge base ingestion completed!");
