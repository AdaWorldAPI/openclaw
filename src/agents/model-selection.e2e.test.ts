import { describe, it, expect, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  parseModelRef,
  resolveModelRefFromString,
  resolveConfiguredModelRef,
  buildModelAliasIndex,
  normalizeProviderId,
  modelKey,
} from "./model-selection.js";

describe("model-selection", () => {
  describe("normalizeProviderId", () => {
    it("should normalize provider names", () => {
      expect(normalizeProviderId("Anthropic")).toBe("anthropic");
      expect(normalizeProviderId("Z.ai")).toBe("zai");
      expect(normalizeProviderId("z-ai")).toBe("zai");
      expect(normalizeProviderId("OpenCode-Zen")).toBe("opencode");
      expect(normalizeProviderId("qwen")).toBe("qwen-portal");
      expect(normalizeProviderId("kimi-code")).toBe("kimi-coding");
    });
  });

  describe("parseModelRef", () => {
    it("should parse full model refs", () => {
      expect(parseModelRef("anthropic/claude-opus-4-5-20251101", "openai")).toEqual({
        provider: "anthropic",
        model: "claude-opus-4-5-20251101",
      });
    });

    it("preserves nested model ids after provider prefix", () => {
      expect(parseModelRef("nvidia/moonshotai/kimi-k2.5", "anthropic")).toEqual({
        provider: "nvidia",
        model: "moonshotai/kimi-k2.5",
      });
    });

    it("normalizes anthropic alias refs to canonical model ids", () => {
      expect(parseModelRef("anthropic/opus-4.6", "openai")).toEqual({
        provider: "anthropic",
        model: "claude-opus-4-5",
      });
      expect(parseModelRef("opus-4.6", "anthropic")).toEqual({
        provider: "anthropic",
        model: "claude-opus-4-5",
      });
      expect(parseModelRef("anthropic/sonnet-4.6", "openai")).toEqual({
        provider: "anthropic",
        model: "claude-opus-4-5",
      });
      expect(parseModelRef("sonnet-4.6", "anthropic")).toEqual({
        provider: "anthropic",
        model: "claude-opus-4-5",
      });
    });

    it("should use default provider if none specified", () => {
      expect(parseModelRef("claude-opus-4-5-20251101", "anthropic")).toEqual({
        provider: "anthropic",
        model: "claude-opus-4-5-20251101",
      });
    });

    it("normalizes openai gpt-5.3 codex refs to openai-codex provider", () => {
      expect(parseModelRef("openai/gpt-5.3-codex", "anthropic")).toEqual({
        provider: "openai-codex",
        model: "gpt-5.3-codex",
      });
      expect(parseModelRef("gpt-5.3-codex", "openai")).toEqual({
        provider: "openai-codex",
        model: "gpt-5.3-codex",
      });
      expect(parseModelRef("openai/gpt-5.3-codex-codex", "anthropic")).toEqual({
        provider: "openai-codex",
        model: "gpt-5.3-codex-codex",
      });
    });

    it("should return null for empty strings", () => {
      expect(parseModelRef("", "anthropic")).toBeNull();
      expect(parseModelRef("  ", "anthropic")).toBeNull();
    });

    it("should handle invalid slash usage", () => {
      expect(parseModelRef("/", "anthropic")).toBeNull();
      expect(parseModelRef("anthropic/", "anthropic")).toBeNull();
      expect(parseModelRef("/model", "anthropic")).toBeNull();
    });
  });

  describe("buildModelAliasIndex", () => {
    it("should build alias index from config", () => {
      const cfg: Partial<OpenClawConfig> = {
        agents: {
          defaults: {
            models: {
              "anthropic/claude-opus-4-5-20251101": { alias: "fast" },
              "openai/gpt-4o": { alias: "smart" },
            },
          },
        },
      };

      const index = buildModelAliasIndex({
        cfg: cfg as OpenClawConfig,
        defaultProvider: "anthropic",
      });

      expect(index.byAlias.get("fast")?.ref).toEqual({
        provider: "anthropic",
        model: "claude-opus-4-5-20251101",
      });
      expect(index.byAlias.get("smart")?.ref).toEqual({ provider: "openai", model: "gpt-4o" });
      expect(index.byKey.get(modelKey("anthropic", "claude-opus-4-5-20251101"))).toEqual(["fast"]);
    });
  });

  describe("resolveModelRefFromString", () => {
    it("should resolve from string with alias", () => {
      const index = {
        byAlias: new Map([
          ["fast", { alias: "fast", ref: { provider: "anthropic", model: "sonnet" } }],
        ]),
        byKey: new Map(),
      };

      const resolved = resolveModelRefFromString({
        raw: "fast",
        defaultProvider: "openai",
        aliasIndex: index,
      });

      expect(resolved?.ref).toEqual({ provider: "anthropic", model: "sonnet" });
      expect(resolved?.alias).toBe("fast");
    });

    it("should resolve direct ref if no alias match", () => {
      const resolved = resolveModelRefFromString({
        raw: "openai/gpt-4",
        defaultProvider: "anthropic",
      });
      expect(resolved?.ref).toEqual({ provider: "openai", model: "gpt-4" });
    });
  });

  describe("resolveConfiguredModelRef", () => {
    it("should fall back to anthropic and warn if provider is missing for non-alias", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const cfg: Partial<OpenClawConfig> = {
        agents: {
          defaults: {
            model: { primary: "claude-opus-4-5-20251101" },
          },
        },
      };

      const result = resolveConfiguredModelRef({
        cfg: cfg as OpenClawConfig,
        defaultProvider: "google",
        defaultModel: "gemini-pro",
      });

      expect(result).toEqual({ provider: "anthropic", model: "claude-opus-4-5-20251101" });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to "anthropic/claude-opus-4-5-20251101"'),
      );
      warnSpy.mockRestore();
    });

    it("should use default provider/model if config is empty", () => {
      const cfg: Partial<OpenClawConfig> = {};
      const result = resolveConfiguredModelRef({
        cfg: cfg as OpenClawConfig,
        defaultProvider: "openai",
        defaultModel: "gpt-4",
      });
      expect(result).toEqual({ provider: "openai", model: "gpt-4" });
    });
  });
});
