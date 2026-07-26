"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USER_SESSION_COOKIE } from "./auth";

export async function logoutUser() {
  const cookieStore = await cookies();

  cookieStore.delete(USER_SESSION_COOKIE);

  redirect("/login");
}