import Booking from "#models/booking";
import { formatOwnerScheduledAt } from "#services/owner_assistant_context";
import { bookingWorkspaceHref } from "#services/workspace_links";
import type { HttpContext } from "@adonisjs/core/http";

export default class AgentOperationsBookingsController {
  async show({ params, response, ownerOperationsCapability }: HttpContext) {
    const bookingId = Number(params.id);
    if (!Number.isInteger(bookingId) || !ownerOperationsCapability.bookingIds.includes(bookingId)) {
      return response.forbidden({ error: "That booking is outside this operations context." });
    }

    const booking = await Booking.query().where("id", bookingId).preload("customer").first();
    if (!booking) return response.notFound({ error: "Booking not found." });

    return {
      booking: {
        id: booking.id,
        customer: booking.customer.name,
        service: booking.service,
        staff: booking.staff,
        scheduledAtDisplay: formatOwnerScheduledAt(booking.scheduledAt),
        durationMinutes: booking.durationMinutes,
        status: booking.status,
        serviceAddress: booking.serviceAddress,
        href: bookingWorkspaceHref(booking.id),
      },
    };
  }
}
