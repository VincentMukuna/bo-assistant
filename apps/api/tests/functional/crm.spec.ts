import User from "#models/user";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";

test.group("CRM API", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("rejects guests from CRM resources", async ({ client }) => {
    const response = await client.get("/api/v1/customers");
    response.assertStatus(401);
  });

  test("creates a session from valid email and password credentials", async ({ client }) => {
    const user = await User.create({
      fullName: "Kim Lewis",
      email: "owner@example.com",
      password: "password123",
    });

    const login = await client.post("/api/v1/auth/login").json({
      email: "owner@example.com",
      password: "password123",
    });

    login.assertStatus(200);
    login.assertBodyContains({ data: { email: "owner@example.com" } });
    login.assertCookie("adonis-session");

    const profile = await client.get("/api/v1/profile").withGuard("web").loginAs(user);

    profile.assertStatus(200);
    profile.assertBodyContains({ data: { email: "owner@example.com" } });
  });

  test("persists customer and booking CRUD and cascades customer deletion", async ({
    client,
    db,
  }) => {
    const user = await User.create({
      fullName: "Kim Lewis",
      email: "owner@example.com",
      password: "password123",
    });

    const customerResponse = await client
      .post("/api/v1/customers")
      .withGuard("web")
      .loginAs(user)
      .json({
        name: "Alice Morgan",
        email: "alice@example.com",
        phone: "+1 555 0192",
        address: "1842 Pine Street",
        notes: "Use the side gate",
      });

    customerResponse.assertStatus(201);
    const customerId = (customerResponse.body() as unknown as { id: number }).id;
    await db.assertHas("customers", { id: customerId, email: "alice@example.com" });

    const bookingResponse = await client
      .post("/api/v1/bookings")
      .withGuard("web")
      .loginAs(user)
      .json({
        customerId,
        service: "Deep home clean",
        staff: "Jamie + Rosa",
        scheduledAt: "2026-08-18T14:30:00.000Z",
        durationMinutes: 180,
        status: "needs_approval",
        serviceAddress: "1842 Pine Street",
      });

    bookingResponse.assertStatus(201);
    const bookingId = (bookingResponse.body() as unknown as { id: number }).id;
    await db.assertHas("bookings", { id: bookingId, customer_id: customerId });

    const update = await client
      .patch(`/api/v1/bookings/${bookingId}`)
      .withGuard("web")
      .loginAs(user)
      .json({ status: "completed" });

    update.assertStatus(200);
    update.assertBodyContains({ id: bookingId, status: "completed" });
    await db.assertHas("bookings", { id: bookingId, status: "completed" });

    const deletion = await client
      .delete(`/api/v1/customers/${customerId}`)
      .withGuard("web")
      .loginAs(user);

    deletion.assertStatus(204);
    await db.assertMissing("customers", { id: customerId });
    await db.assertMissing("bookings", { id: bookingId });
  });
});
