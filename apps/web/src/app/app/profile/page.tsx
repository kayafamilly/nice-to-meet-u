import { ProfileForm } from "@/components/profile-form";
import { requireOnboardedUser } from "@/lib/auth/app-user";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  await requireOnboardedUser();
  return <ProfileForm />;
}
