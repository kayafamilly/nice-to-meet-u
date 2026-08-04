import { NextRequest } from "next/server";
import { z } from "zod";
import { destroySession, getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import type { Profile } from "@/types/api";

const practiceLanguageSchema = z.object({
  languageId: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced"])
});

const updateSchema = z.object({
  displayName: z.string().trim().min(2).max(40).optional(),
  practiceLanguages: z.array(practiceLanguageSchema).min(1).max(3).optional(),
  targetLanguageId: z.string().min(1).optional(),
  targetLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  timeZone: z.string().trim().min(1).max(64).optional()
}).transform((input, context) => {
  const practiceLanguages = input.practiceLanguages ?? (input.targetLanguageId && input.targetLevel ? [{ languageId: input.targetLanguageId, level: input.targetLevel }] : []);
  if (!practiceLanguages.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose at least one practice language" });
  if (new Set(practiceLanguages.map((language) => language.languageId)).size !== practiceLanguages.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Practice languages must be unique" });
  return { displayName: input.displayName, practiceLanguages, timeZone: input.timeZone };
});

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  try {
    return noStoreJson(await callBusinessRoute<Profile>("/api/ntmy/profile", { method: "GET" }, session));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const input = updateSchema.parse(await request.json());
    return noStoreJson(await callBusinessRoute("/api/ntmy/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    }, session));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const result = await callBusinessRoute("/api/ntmy/profile", { method: "DELETE" }, session);
    await destroySession();
    return noStoreJson(result);
  } catch (error) {
    return apiError(error);
  }
}
