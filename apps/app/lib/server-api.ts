import "server-only";

import { cookies } from "next/headers";

import { createApi, isUnauthorizedApiError, type User } from "@/lib/api";
import { getBackendUrl } from "@/lib/backend-url";

export async function getServerProfile(): Promise<User | null> {
  const cookieHeader = (await cookies()).toString();
  const api = createApi({
    baseUrl: getBackendUrl(),
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });

  try {
    return await api.profile();
  } catch (error) {
    if (isUnauthorizedApiError(error)) return null;
    throw error;
  }
}
