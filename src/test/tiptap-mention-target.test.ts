import { describe, expect, it } from "vitest";
import { resolveMentionTargetType } from "@/lib/tiptap-content";

describe("resolveMentionTargetType", () => {
  it("recognizes note mentions in current and legacy formats", () => {
    expect(resolveMentionTargetType("note")).toBe("note");
    expect(resolveMentionTargetType("NOTE")).toBe("note");
    expect(resolveMentionTargetType("entity", "NOTE")).toBe("note");
  });

  it("defaults entity mentions to entity navigation", () => {
    expect(resolveMentionTargetType("entity")).toBe("entity");
    expect(resolveMentionTargetType(null, undefined)).toBe("entity");
  });
});
