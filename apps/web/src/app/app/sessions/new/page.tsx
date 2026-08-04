import { CreateSessionForm } from "@/components/create-session-form";
import { requireOnboardedUser } from "@/lib/auth/app-user";

export default async function NewSessionPage() {
  await requireOnboardedUser();
  return <main className="page-shell"><CreateSessionForm /></main>;
}
