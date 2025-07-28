import "dotenv/config";
import { vi } from "vitest";

// Mock console.log to avoid noise in tests
vi.mock("console", () => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));
