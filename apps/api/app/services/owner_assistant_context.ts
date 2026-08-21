import Booking from "#models/booking";
import Customer from "#models/customer";

const BUSINESS_TIME_ZONE = "America/Los_Angeles";

function scheduledAtDisplay(value: Booking["scheduledAt"]) {
  return value.setZone(BUSINESS_TIME_ZONE).toFormat("ccc, LLL d 'at' h:mm a ZZZZ");
}

export type OwnerAssistantSurface = "overview" | "bookings" | "customer";

export async function buildOwnerAssistantPageContext(
  surface: OwnerAssistantSurface,
  customerId?: number
) {
  if (surface === "bookings") {
    const bookings = await Booking.query()
      .preload("customer")
      .orderBy("scheduledAt", "desc")
      .limit(50);

    return {
      surface,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        customer: booking.customer.name,
        service: booking.service,
        staff: booking.staff,
        scheduledAtDisplay: scheduledAtDisplay(booking.scheduledAt),
        durationMinutes: booking.durationMinutes,
        status: booking.status,
        serviceAddress: booking.serviceAddress,
        href: `/bookings?view=agenda&booking=${booking.id}`,
      })),
    };
  }

  if (surface === "customer" && customerId) {
    const customer = await Customer.query()
      .where("id", customerId)
      .preload("bookings", (query) => query.orderBy("scheduledAt", "desc").limit(30))
      .preload("supportConversations", (query) => query.orderBy("updatedAt", "desc").limit(10))
      .first();

    if (!customer) return { surface, customer: null };

    return {
      surface,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        bookings: customer.bookings.map((booking) => ({
          id: booking.id,
          service: booking.service,
          staff: booking.staff,
          scheduledAtDisplay: scheduledAtDisplay(booking.scheduledAt),
          durationMinutes: booking.durationMinutes,
          status: booking.status,
          serviceAddress: booking.serviceAddress,
          href: `/bookings?view=agenda&booking=${booking.id}`,
        })),
        recentConversations: customer.supportConversations.map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          preview: conversation.lastMessagePreview,
          status: conversation.status,
          nextStep: conversation.nextStepOwner,
          outcome: conversation.outcomeStatus,
          outcomeSummary: conversation.outcomeSummary,
          updatedAt: (conversation.updatedAt ?? conversation.createdAt).toISO(),
          href: `/inbox?conversation=${conversation.id}`,
        })),
      },
    };
  }

  return { surface: "overview" as const };
}
