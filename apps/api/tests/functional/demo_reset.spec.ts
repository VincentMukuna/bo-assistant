import resetDemo from "#actions/reset-demo";
import {
  beginDemoReset,
  completeDemoReset,
  failDemoReset,
  readDemoResetState,
} from "#services/demo_reset_state";
import Customer from "#models/customer";
import User from "#models/user";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

async function leaveResetReady() {
  const current = await readDemoResetState();
  if (current.status === "resetting") {
    await completeDemoReset(current.generation);
    return;
  }
  if (current.status === "failed") {
    const started = await beginDemoReset();
    await completeDemoReset(started.generation);
  }
}

test.group("Demo reset", (group) => {
  group.each.setup(async () => {
    await leaveResetReady();
    return testUtils.db().wrapInGlobalTransaction();
  });
  group.each.teardown(leaveResetReady);

  test("publishes progress while rebuilding the showcase dataset", async ({ assert }) => {
    const staleCustomer = await Customer.create({
      name: "Stale Customer",
      email: "stale-reset@example.com",
      phone: "+1 (415) 555-0100",
      address: "Old demo address",
      notes: "This record should be removed.",
      emailVerifiedAt: DateTime.now(),
    });
    const progress: number[] = [];

    const result = await resetDemo({
      includeConversations: false,
      drainMs: 0,
      onProgress: (state) => {
        progress.push(state.progress);
      },
    });

    assert.isNull(await Customer.find(staleCustomer.id));
    assert.lengthOf(await Customer.all(), 5);
    assert.deepEqual(progress, [5, 15, 40, 65, 92, 98, 100]);
    assert.equal(result.state.status, "ready");
    assert.equal(result.state.message, "Demo ready");
  });

  test("blocks requests during a reset and invalidates an existing owner session", async ({
    client,
    assert,
  }) => {
    const user = await User.firstOrCreate(
      { email: "kim@oakandpine.test" },
      { fullName: "Kim Lewis", email: "kim@oakandpine.test", password: "password123" }
    );
    const ready = await readDemoResetState();
    const profile = await client
      .get("/api/v1/profile")
      .withSession({ demoResetGeneration: ready.generation })
      .withGuard("web")
      .loginAs(user);
    profile.assertStatus(200);
    let session = profile.session();

    const started = await beginDemoReset();
    const status = await client.get("/api/v1/demo/reset").withSession(session);
    status.assertStatus(200);
    assert.equal(status.header("x-demo-session-reset"), "true");
    assert.equal(status.body().reset.generation, started.generation);
    session = status.session();

    const blocked = await client.get("/api/v1/profile").withSession(session);
    blocked.assertStatus(503);
    blocked.assertBodyContains({ error: "Demo reset in progress" });
    session = blocked.session();

    await completeDemoReset(started.generation);
    const signedOut = await client.get("/api/v1/profile").withSession(session);
    signedOut.assertStatus(401);
  });

  test("keeps the write lock visible when a reset fails", async ({ client, assert }) => {
    const started = await beginDemoReset();
    await failDemoReset(started.generation);

    const blocked = await client.post("/api/v1/auth/login").json({
      email: "kim@oakandpine.test",
      password: "password123",
    });
    blocked.assertStatus(503);
    blocked.assertBodyContains({ error: "Demo reset needs attention" });

    const status = await client.get("/api/v1/demo/reset");
    status.assertStatus(200);
    assert.equal(status.body().reset.status, "failed");
    assert.equal(status.body().reset.message, "The reset stopped before completion.");
  });
});
