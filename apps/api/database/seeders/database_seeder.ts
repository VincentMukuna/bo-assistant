import { BaseSeeder } from "@adonisjs/lucid/seeders";
import Booking from "#models/booking";
import Customer from "#models/customer";
import User from "#models/user";
import { DateTime } from "luxon";

export default class extends BaseSeeder {
  async run() {
    await User.firstOrCreate(
      { email: "owner@oakandpine.test" },
      { fullName: "Kim Lewis", email: "owner@oakandpine.test", password: "password123" }
    );

    const customers = await Promise.all([
      Customer.firstOrCreate(
        { email: "alice.morgan@example.com" },
        {
          name: "Alice Morgan",
          email: "alice.morgan@example.com",
          phone: "+1 (415) 555-0192",
          address: "1842 Pine Street, San Francisco",
          notes:
            "Prefers the same cleaning team. Side gate code is 2814. Has a small, friendly dog.",
        }
      ),
      Customer.firstOrCreate(
        { email: "marcus.lee@example.com" },
        {
          name: "Marcus Lee",
          email: "marcus.lee@example.com",
          phone: "+1 (415) 555-0138",
          address: "731 20th Avenue, San Francisco",
          notes: "Please call on arrival; the front buzzer is unreliable.",
        }
      ),
      Customer.firstOrCreate(
        { email: "sophie.b@example.com" },
        {
          name: "Sophie Bennett",
          email: "sophie.b@example.com",
          phone: "+1 (415) 555-0165",
          address: "94 Cole Street, San Francisco",
          notes: "Tenant. Landlord approval is required for repairs over $250.",
        }
      ),
      Customer.firstOrCreate(
        { email: "daniel.o@example.com" },
        {
          name: "Daniel Okafor",
          email: "daniel.o@example.com",
          phone: "+1 (415) 555-0107",
          address: "2206 Bryant Street, San Francisco",
          notes: "Best reached by email during work hours.",
        }
      ),
      Customer.firstOrCreate(
        { email: "maya.patel@example.com" },
        {
          name: "Maya Patel",
          email: "maya.patel@example.com",
          phone: "+1 (415) 555-0177",
          address: "51 Divisadero Street, San Francisco",
          notes: "Uses fragrance-free cleaning products kept under the kitchen sink.",
        }
      ),
    ]);

    const [alice, marcus, sophie, daniel, maya] = customers;
    const bookings = [
      [marcus, "Tap repair", "Noah", "2026-08-17T09:00:00", 90, "in_progress"],
      [sophie, "Drywall repair", "Eli", "2026-08-18T10:00:00", 120, "confirmed"],
      [alice, "Deep home clean", "Jamie + Rosa", "2026-08-18T14:30:00", 180, "needs_approval"],
      [maya, "Home clean + oven", "Jamie", "2026-08-19T08:30:00", 180, "confirmed"],
      [daniel, "Door hinge repair", "Eli", "2026-08-20T13:00:00", 60, "confirmed"],
      [alice, "Window track repair", "Noah", "2026-08-21T11:30:00", 90, "confirmed"],
    ] as const;

    for (const [customer, service, staff, scheduledAt, durationMinutes, status] of bookings) {
      await Booking.firstOrCreate(
        { customerId: customer.id, service },
        {
          customerId: customer.id,
          service,
          staff,
          scheduledAt: DateTime.fromISO(scheduledAt),
          durationMinutes,
          status,
          serviceAddress: customer.address,
        }
      );
    }
  }
}
