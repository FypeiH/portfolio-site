import { describe, expect, it } from "vitest";
import { ProfileSchema } from "@/lib/content/schema";
import { ContentError, parseContent } from "@/lib/content/validate";
import { profile } from "@/content/profile";

describe("parseContent", () => {
  it("returns validated data", () => {
    expect(parseContent(ProfileSchema, profile, "content/profile.ts").name).toBe("Filipe Bravo");
  });

  it("breaks with the file and the field when content is invalid", () => {
    const broken = { ...profile, tagline: "x".repeat(91) };
    expect(() => parseContent(ProfileSchema, broken, "content/profile.ts")).toThrow(ContentError);
    expect(() => parseContent(ProfileSchema, broken, "content/profile.ts")).toThrow(/content\/profile\.ts → tagline:/);
  });
});
