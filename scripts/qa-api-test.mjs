import crypto from "node:crypto";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

const state = {
  cookie: "",
  userId: "",
  orderId: "",
};

const results = [];

const parseJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const request = async (path, init = {}, opts = {}) => {
  const headers = new Headers(init.headers || {});

  if (state.cookie && !opts.noCookie) {
    headers.set("cookie", state.cookie);
  }

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    redirect: opts.redirect || "follow",
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie && setCookie.includes("busmap_session=")) {
    state.cookie = setCookie.split(";")[0];
  }

  return res;
};

const record = (name, passed, detail = "") => {
  results.push({ name, passed, detail });
};

const expectStatus = async (name, res, expected, detail = "") => {
  const ok = res.status === expected;
  record(name, ok, `${detail} expected=${expected} actual=${res.status}`.trim());
  return ok;
};

const run = async () => {
  const email = `qa_${Date.now()}_${crypto.randomInt(1000, 9999)}@example.com`;
  const password = "QaStrongPass123";

  let res = await request("/api/auth/me", {}, { noCookie: true });
  await expectStatus("Auth me without session returns 401", res, 401);

  res = await request(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    { noCookie: true },
  );
  await expectStatus("Register missing password returns 400", res, 400);

  res = await request(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password: "123" }),
    },
    { noCookie: true },
  );
  await expectStatus("Register weak password returns 400", res, 400);

  res = await request(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { noCookie: true },
  );
  const registerBody = await parseJson(res);
  const registerOk = await expectStatus("Register valid account returns 200", res, 200);
  if (registerOk && registerBody?.id) {
    state.userId = registerBody.id;
  }

  res = await request(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { noCookie: true },
  );
  await expectStatus("Register duplicate email returns 409", res, 409);

  res = await request(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password: "wrong-pass" }),
    },
    { noCookie: true },
  );
  await expectStatus("Login wrong password returns 401", res, 401);

  state.cookie = "";
  res = await request(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { noCookie: true },
  );
  const loginBody = await parseJson(res);
  const loginOk = await expectStatus("Login valid account returns 200", res, 200);
  record(
    "Login sets session cookie",
    Boolean(state.cookie),
    state.cookie ? "busmap_session cookie set" : "cookie missing",
  );
  if (!state.userId && loginBody?.userId) {
    state.userId = loginBody.userId;
  }

  res = await request("/api/auth/me");
  const meBody = await parseJson(res);
  await expectStatus("Auth me with session returns 200", res, 200);
  if (!state.userId && meBody?.id) {
    state.userId = meBody.id;
  }

  res = await request("/api/wallet/balance");
  const walletStart = await parseJson(res);
  await expectStatus("Wallet balance with session returns 200", res, 200);

  res = await request("/api/tickets/buy", {
    method: "POST",
    body: JSON.stringify({ routeId: 1, price: 7000 }),
  });
  await expectStatus("Buy ticket with insufficient balance returns 400", res, 400);

  res = await request("/api/payments/topup/create", {
    method: "POST",
    body: JSON.stringify({ amount: 0 }),
  });
  await expectStatus("Create topup invalid amount returns 400", res, 400);

  res = await request("/api/payments/topup/create", {
    method: "POST",
    body: JSON.stringify({ amount: 50000 }),
  });
  const createTopupBody = await parseJson(res);
  const topupCreateOk = await expectStatus("Create topup valid request returns 200", res, 200);
  if (topupCreateOk) {
    state.orderId = createTopupBody?.orderId || "";
  }

  if (state.orderId) {
    res = await request(`/api/payments/topup/${state.orderId}/status`, {}, { noCookie: true });
    const orderNoAuthBody = await parseJson(res);
    const unauthorizedProtected = res.status === 401 || res.status === 403;
    record(
      "Topup status endpoint requires auth (security check)",
      unauthorizedProtected,
      unauthorizedProtected ? `status=${res.status}` : `status=${res.status} body=${JSON.stringify(orderNoAuthBody)}`,
    );

    res = await request(`/api/payments/topup/${state.orderId}/status`);
    await expectStatus("Topup status with session returns 200", res, 200);

    res = await request(`/api/payments/topup/confirm?orderId=${state.orderId}`, {}, { redirect: "manual" });
    const location = res.headers.get("location") || "";
    const confirmOk = res.status === 307 && location.includes("/payment/scan-result?status=success");
    record("Confirm topup redirects to payment result page", confirmOk, `status=${res.status} location=${location}`);

    res = await request(`/api/payments/topup/${state.orderId}/status`);
    const afterConfirmBody = await parseJson(res);
    const afterConfirmOk = res.status === 200 && afterConfirmBody?.status === "success";
    record(
      "Topup status becomes success after confirm",
      afterConfirmOk,
      `status=${res.status} bodyStatus=${afterConfirmBody?.status}`,
    );

    res = await request(
      "/api/payments/webhook",
      {
        method: "POST",
        body: JSON.stringify({ orderId: state.orderId, status: "success" }),
      },
      { noCookie: true },
    );
    await expectStatus("Webhook success on existing order returns 200", res, 200);
  } else {
    record("Topup flow dependent checks", false, "Skipped because orderId was not created");
  }

  res = await request("/api/wallet/balance");
  const walletAfterTopup = await parseJson(res);
  const topupApplied =
    res.status === 200 &&
    typeof walletStart?.balance === "number" &&
    typeof walletAfterTopup?.balance === "number" &&
    walletAfterTopup.balance >= walletStart.balance + 50000;
  record(
    "Wallet balance increases after topup",
    topupApplied,
    `before=${walletStart?.balance} after=${walletAfterTopup?.balance}`,
  );

  res = await request("/api/tickets/buy", {
    method: "POST",
    body: JSON.stringify({ routeId: 1, price: 7000 }),
  });
  await expectStatus("Buy ticket after topup returns 200", res, 200);

  res = await request("/api/tickets/my");
  const ticketsMy = await parseJson(res);
  await expectStatus("Tickets my returns 200", res, 200);

  res = await request("/api/my-tickets");
  const myTickets = await parseJson(res);
  await expectStatus("My tickets alias returns 200", res, 200);
  const sameCount =
    Array.isArray(ticketsMy?.items) &&
    Array.isArray(myTickets?.items) &&
    ticketsMy.items.length === myTickets.items.length;
  record(
    "Tickets endpoints consistency check",
    sameCount,
    `tickets/my=${ticketsMy?.items?.length ?? "n/a"} my-tickets=${myTickets?.items?.length ?? "n/a"}`,
  );

  const headerOnlyUserId = meBody?.id || state.userId;
  res = await request(
    "/api/wallet/balance",
    {
      headers: {
        "x-user-id": headerOnlyUserId,
      },
    },
    { noCookie: true },
  );
  const headerOnlyBlocked = res.status === 401 || res.status === 403;
  record("Header-only x-user-id cannot bypass auth (security check)", headerOnlyBlocked, `status=${res.status}`);

  res = await request("/api/auth/logout", { method: "POST" });
  await expectStatus("Logout returns 200", res, 200);

  state.cookie = "";
  res = await request("/api/auth/me", {}, { noCookie: true });
  await expectStatus("Auth me after logout returns 401", res, 401);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        executedAt: new Date().toISOString(),
        total: results.length,
        passed,
        failed,
        results,
      },
      null,
      2,
    ),
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
