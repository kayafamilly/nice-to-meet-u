import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { apiError, noStoreJson, unauthorized } from "@/lib/http";
import { callBusinessRoute } from "@/lib/pocketbase/server";
import { assertCsrf, assertTrustedOrigin } from "@/lib/security/request";
import { assertRateLimit } from "@/lib/security/rate-limit";

const practiceLanguageSchema = z.object({
  languageId: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced"])
});

const inputSchema = z.object({
  timeZone: z.string().min(1).max(64),
  nativeLanguageIds: z.array(z.string().min(1)).min(1).max(3).optional(),
  practiceLanguages: z.array(practiceLanguageSchema).min(1).max(3).optional(),
  nativeLanguageId: z.string().min(1).optional(),
  targetLanguageId: z.string().min(1).optional(),
  targetLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  communityRulesAccepted: z.literal(true)
}).transform((input, context) => {
  const nativeLanguageIds = input.nativeLanguageIds ?? (input.nativeLanguageId ? [input.nativeLanguageId] : []);
  const practiceLanguages = input.practiceLanguages ?? (input.targetLanguageId && input.targetLevel ? [{ languageId: input.targetLanguageId, level: input.targetLevel }] : []);
  if (new Set(nativeLanguageIds).size !== nativeLanguageIds.length || new Set(practiceLanguages.map((language) => language.languageId)).size !== practiceLanguages.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Languages must be unique" });
  if (practiceLanguages.some((language) => nativeLanguageIds.includes(language.languageId))) context.addIssue({ code: z.ZodIssueCode.custom, message: "A language cannot be both native and practice" });
  return { nativeLanguageIds, practiceLanguages, timeZone: input.timeZone, communityRulesAccepted: input.communityRulesAccepted };
});

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    assertCsrf(request);
    assertRateLimit(request, "onboarding", 10, 60 * 60 * 1000);
    const session = await getServerSession();
    if (!session) return unauthorized();
    const input = inputSchema.parse(await request.json());
    const result = await callBusinessRoute("/api/ntmy/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    }, session);
    return noStoreJson(result);
  } catch (error) {
    return apiError(error);
  }
}
