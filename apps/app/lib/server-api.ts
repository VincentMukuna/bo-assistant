import "server-only";

import { cookies } from "next/headers";

import { ApiError, createApi, type Booking, type User } from "@/lib/api";
import { getBackendUrl } from "@/lib/backend-url";

async function serverApi() {
  const cookieHeader = (await cookies()).toString();
  return createApi({
    baseUrl: getBackendUrl(),
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });
}

export async function getServerProfile(): Promise<User | null> {
  const api = await serverApi();

  try {
    return await api.profile();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function getServerBooking(id: number): Promise<Booking | null> {
  const api = await serverApi();

  try {
    return await api.bookings.show(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
