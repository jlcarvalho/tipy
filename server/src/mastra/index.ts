import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from "@copilotkit/runtime";

import { Mastra } from "@mastra/core";
import { MastraClient } from "@mastra/client-js";
import { PgVector } from "@mastra/pg";
import { PostgresStore } from "@mastra/pg";
import { registerApiRoute } from "@mastra/core/server";
import { tipyAgent } from "./agents/tipyAgent";
import { tftAgent } from "./agents/tftAgent";
import { userDataAnalystAgent } from "./agents/userDataAnalystAgent";
import { withdrawalSpecialistAgent } from "./agents/withdrawalSpecialistAgent";
import { knowledgeRetrievalAgent } from "./agents/knowledgeRetrievalAgent";
import jwt from "jsonwebtoken";

const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

// Initialize PostgreSQL storage for telemetry, memory, workflows, and eval data
const pgStorage = new PostgresStore({
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

// Initialize the vector store
await pgVector.createIndex({
  indexName: "tipy",
  dimension: 1536,
});

await pgVector.createIndex({
  indexName: "tft_academy",
  dimension: 1536,
});

const serviceAdapter = new ExperimentalEmptyAdapter();

export const mastra = new Mastra({
  agents: {
    tipyAgent,
    tftAgent,
    userDataAnalystAgent,
    withdrawalSpecialistAgent,
    knowledgeRetrievalAgent,
  },
  vectors: {
    pgVector,
  },
  storage: pgStorage,
  server: {
    middleware: [
      async (c, next) => {
        const authHeader = c.req.header("Authorization");
        const runtimeContext = c.get("runtimeContext");

        let userId = "camilasavia@gmail.com"; // Default fallback

        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.substring(7); // Remove "Bearer " prefix

          try {
            // Decode the token without verification for now
            // In production, you should verify with a secret key
            const decoded = jwt.verify(token, "your-secret-key") as any;

            // For production, use jwt.verify instead:
            // const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            if (decoded && (decoded.userId || decoded.sub || decoded.id)) {
              userId = decoded.userId || decoded.sub || decoded.id;
            }
          } catch (error) {
            console.warn("Failed to decode JWT token:", error);
            // Keep using default userId
          }
        }

        runtimeContext.set("user-id", userId);

        await next();
      },
    ],
    cors: {
      origin: ["http://localhost:5173"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "x-copilotkit-runtime-client-gql-version",
      ],
      credentials: false,
    },
    apiRoutes: [
      registerApiRoute("/copilotkit", {
        method: `POST`,
        handler: async (c) => {
          const client = new MastraClient({
            baseUrl: "http://localhost:4111",
          });

          const runtime = new CopilotRuntime({
            agents: (await client.getAGUI({
              resourceId: "tipyAgent",
            })) as any,
          });

          const handler = copilotRuntimeNodeHttpEndpoint({
            endpoint: "/copilotkit",
            runtime,
            serviceAdapter,
          });

          return handler.handle(c.req.raw, {});
        },
      }),
    ],
  },
});
