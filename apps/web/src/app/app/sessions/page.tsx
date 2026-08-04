import { SessionBrowser } from "@/components/session-browser";
import { requireOnboardedUser } from "@/lib/auth/app-user";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  await requireOnboardedUser();
  return <main className="shell page-shell"><div className="page-heading"><div className="page-heading-copy"><p className="eyebrow">International speaking practice</p><h1 className="page-title">Explore sessions</h1><p>Join two to four people practising the same language, wherever they are in the world.</p></div></div><SessionBrowser /></main>;
}
