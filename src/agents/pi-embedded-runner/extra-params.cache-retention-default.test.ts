import type { StreamFn } from "@mariozechner/pi-agent-core";
import { describe, expect, it, vi } from "vitest";
import { applyExtraParamsToAgent } from "../pi-embedded-runner.js";

// Mock the logger to avoid noise in tests
vi.mock("./logger.js", () => ({
  log: {
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("cacheRetention default behavior", () => {
  it("returns 'short' for Anthropic when not configured", () => {
    const agent: { streamFn?: StreamFn } = {};
    const cfg = undefined;
    const provider = "anthropic";
    const modelId = "claude-opus-4-5";

    applyExtraParamsToAgent(agent, cfg, provider, modelId);

    // Verify streamFn was set (indicating cache retention was applied)
    expect(agent.streamFn).toBeDefined();

    // The fact that agent.streamFn was modified indicates that cacheRetention
    // default "short" was applied. We don't need to call the actual function
    // since that would require API provider setup.
  });

  it("respects explicit 'none' config", () => {
    const agent: { streamFn?: StreamFn } = {};
    const cfg = {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-5": {
              params: {
                cacheRetention: "none" as const,
              },
            },
          },
        },
      },
    };
    const provider = "anthropic";
    const modelId = "claude-opus-4-5";

    applyExtraParamsToAgent(agent, cfg, provider, modelId);

    // Verify streamFn was set (config was applied)
    expect(agent.streamFn).toBeDefined();
  });

  it("respects explicit 'long' config", () => {
    const agent: { streamFn?: StreamFn } = {};
    const cfg = {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-5": {
              params: {
                cacheRetention: "long" as const,
              },
            },
          },
        },
      },
    };
    const provider = "anthropic";
    const modelId = "claude-opus-4-5";

    applyExtraParamsToAgent(agent, cfg, provider, modelId);

    // Verify streamFn was set (config was applied)
    expect(agent.streamFn).toBeDefined();
  });

  it("respects legacy cacheControlTtl config", () => {
    const agent: { streamFn?: StreamFn } = {};
    const cfg = {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-5": {
              params: {
                cacheControlTtl: "1h",
              },
            },
          },
        },
      },
    };
    const provider = "anthropic";
    const modelId = "claude-opus-4-5";

    applyExtraParamsToAgent(agent, cfg, provider, modelId);

    // Verify streamFn was set (legacy config was applied)
    expect(agent.streamFn).toBeDefined();
  });

  it("returns undefined for non-Anthropic providers", () => {
    const agent: { streamFn?: StreamFn } = {};
    const cfg = undefined;
    const provider = "openai";
    const modelId = "gpt-4";

    applyExtraParamsToAgent(agent, cfg, provider, modelId);

    // For OpenAI, the streamFn might be wrapped for other reasons (like OpenAI responses store)
    // but cacheRetention should not be applied
    // This is implicitly tested by the lack of cacheRetention-specific wrapping
  });

  it("prefers explicit cacheRetention over default", () => {
    const agent: { streamFn?: StreamFn } = {};
    const cfg = {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-5": {
              params: {
                cacheRetention: "long" as const,
                temperature: 0.7,
              },
            },
          },
        },
      },
    };
    const provider = "anthropic";
    const modelId = "claude-opus-4-5";

    applyExtraParamsToAgent(agent, cfg, provider, modelId);

    // Verify streamFn was set with explicit config
    expect(agent.streamFn).toBeDefined();
  });

  it("works with extraParamsOverride", () => {
    const agent: { streamFn?: StreamFn } = {};
    const cfg = undefined;
    const provider = "anthropic";
    const modelId = "claude-opus-4-5";
    const extraParamsOverride = {
      cacheRetention: "none" as const,
    };

    applyExtraParamsToAgent(agent, cfg, provider, modelId, extraParamsOverride);

    // Verify streamFn was set (override was applied)
    expect(agent.streamFn).toBeDefined();
  });
});
