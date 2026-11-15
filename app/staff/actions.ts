"use server";
import { redirect } from "next/navigation";
import { startSession, endSession } from "@/lib/staff/session";

export async function login(form: FormData) {
  const allowed = await startSession(form.get("access"));
  redirect(allowed ? "/staff" : "/staff?login=error");
}

export async function logout() {
  await endSession();
  redirect("/staff");
}
