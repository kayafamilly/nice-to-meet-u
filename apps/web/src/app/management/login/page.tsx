import { redirect } from "next/navigation";
import { ManagementLoginForm } from "@/components/management-login-form";
import { hasManagementSession } from "@/lib/management/auth";
export default async function ManagementLoginPage() { if (await hasManagementSession()) redirect("/management"); return <main className="management-login"><ManagementLoginForm /></main>; }
