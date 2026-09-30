import type { z } from "zod";

export class ContentError extends Error {
  override name = "ContentError";
}

export function parseContent<T extends z.ZodType>(schema: T, data: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues
    .map((issue) => `  ${file} → ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new ContentError(`Invalid content in ${file}:\n${details}`);
}
