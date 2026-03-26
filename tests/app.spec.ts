import { test, expect, Page } from "@playwright/test";

// Helper: seed a campaign into localStorage via addInitScript (runs before page JS)
async function seedCampaign(
  page: Page,
  overrides: Record<string, unknown> = {}
) {
  const campaign = {
    id: "test-campaign-1",
    mainPost:
      "We are hiring! Join our amazing team and build the future of tech. Apply now at https://example.com/careers",
    postGoal: "Hiring",
    sourceUrl: "https://www.linkedin.com/posts/test-post-123",
    campaignType: "both",
    posts: [
      "Post variation 1: We are building something amazing! Join us today. https://example.com/careers",
      "Post variation 2: Looking for talented engineers. Apply now! https://example.com/careers",
      "Post variation 3: Our team is growing fast. Be part of the journey! https://example.com/careers",
      "Post variation 4: Exciting opportunities await. Check us out! https://example.com/careers",
      "Post variation 5: Transform your career with us. Apply today! https://example.com/careers",
      "Post variation 6: Join a world-class team building the future! https://example.com/careers",
    ],
    comments: [
      "This is such a great opportunity! I've heard amazing things about the team culture there.",
      "Bookmarking this for my network. The growth trajectory here is impressive!",
      "We tried something similar at my company and the results were incredible.",
      "Have you considered expanding the engineering team globally? Curious about remote options.",
      "This resonates with me. The tech industry needs more companies with this kind of vision.",
      "Just shared this with three friends who'd be perfect for these roles!",
    ],
    createdAt: new Date().toISOString(),
    published: true,
    ...overrides,
  };

  await page.addInitScript((camp) => {
    localStorage.setItem(
      "linkedin_amplifier_campaigns",
      JSON.stringify([camp])
    );
  }, campaign);

  return campaign;
}

// Helper: clear all localStorage
async function clearStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

// Helper: set admin auth
async function setAdminAuth(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("linkedin_amplifier_auth", "true");
  });
}

// ═══════════════════════════════════════════
// 1. ROOT PAGE — Redirect
// ═══════════════════════════════════════════

test.describe("Root page", () => {
  test("redirects to /post", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/post", { timeout: 10000 });
    expect(page.url()).toContain("/post");
  });
});

// ═══════════════════════════════════════════
// 2. POST PAGE
// ═══════════════════════════════════════════

test.describe("Post page", () => {
  test("shows no active campaign when no campaign exists", async ({
    page,
  }) => {
    await clearStorage(page);
    await page.goto("/post");
    await expect(page.getByText("No active campaign")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows posts not available for comments-only campaign", async ({
    page,
  }) => {
    await seedCampaign(page, { campaignType: "comments" });
    await page.goto("/post");
    await expect(page.getByText("Posts not available")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Go to Comments")).toBeVisible();
  });

  test("shows a post card when campaign has posts", async ({ page }) => {
    await seedCampaign(page, { campaignType: "posts" });
    await page.goto("/post");
    await expect(page.getByText("Your unique post")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Copy & Post on LinkedIn")).toBeVisible();
  });

  test("shows post content from campaign", async ({ page }) => {
    await seedCampaign(page, { campaignType: "both" });
    await page.goto("/post");
    await expect(
      page.getByText("Post variation 1", { exact: false })
    ).toBeVisible({ timeout: 10000 });
  });

  test("has header with Post Amplifier branding", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/post");
    await expect(page.getByText("Post Amplifier")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows instruction steps", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/post");
    await expect(
      page.getByText("Tap the button below to copy")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("LinkedIn opens automatically")
    ).toBeVisible();
    await expect(
      page.getByText("Paste and publish your post")
    ).toBeVisible();
  });

  test("copy button triggers copied state", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await seedCampaign(page);
    await page.goto("/post");

    // Block popups
    page.on("popup", (popup) => popup.close());

    await page.getByText("Copy & Post on LinkedIn").click({ timeout: 10000 });
    await expect(
      page.getByText("Copied! Opening LinkedIn...")
    ).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════
// 3. COMMENT PAGE
// ═══════════════════════════════════════════

test.describe("Comment page", () => {
  test("shows no active campaign when no campaign", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/comment");
    await expect(page.getByText("No active campaign")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows comments not available for posts-only campaign", async ({
    page,
  }) => {
    await seedCampaign(page, { campaignType: "posts" });
    await page.goto("/comment");
    await expect(page.getByText("Comments not available")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Go to Posts")).toBeVisible();
  });

  test("shows comment card for comments campaign", async ({ page }) => {
    await seedCampaign(page, { campaignType: "comments" });
    await page.goto("/comment");
    await expect(page.getByText("Your unique comment")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("Copy & Comment on LinkedIn")
    ).toBeVisible();
  });

  test("displays LinkedIn-style source post card", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/comment");
    await expect(page.getByText("Source Post")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Like")).toBeVisible();
    await expect(page.getByText("Comment")).toBeVisible();
    await expect(page.getByText("Repost")).toBeVisible();
    await expect(page.getByText("Send")).toBeVisible();
  });

  test("shows source post content with URLs", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/comment");
    await expect(
      page.getByText("We are hiring!", { exact: false })
    ).toBeVisible({ timeout: 10000 });
    const link = page.locator('a[href="https://example.com/careers"]');
    await expect(link.first()).toBeVisible();
  });

  test("shows instruction steps for comment flow", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/comment");
    await expect(
      page.getByText("Tap to copy your comment")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("The source post opens automatically")
    ).toBeVisible();
    await expect(
      page.getByText("Paste your comment and submit")
    ).toBeVisible();
  });

  test("copy button works for comments", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await seedCampaign(page);
    await page.goto("/comment");

    page.on("popup", (popup) => popup.close());

    await page
      .getByText("Copy & Comment on LinkedIn")
      .click({ timeout: 10000 });
    await expect(
      page.getByText("Copied! Opening source post...")
    ).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════
// 4. ADMIN PAGE — Login
// ═══════════════════════════════════════════

test.describe("Admin login", () => {
  test("shows login form when not authenticated", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/admin");
    await expect(page.getByText("Welcome back")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByPlaceholder("Enter your password")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeVisible();
  });

  test("shows error for invalid password", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/admin");
    await page
      .getByPlaceholder("Enter your password")
      .fill("wrongpassword", { timeout: 10000 });
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid password")).toBeVisible({
      timeout: 10000,
    });
  });

  test("successful login shows dashboard", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/admin");
    await page
      .getByPlaceholder("Enter your password")
      .fill("admin123", { timeout: 10000 });
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Admin Dashboard")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows decorative panel on desktop", async ({ page }) => {
    await clearStorage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin");
    // The decorative panel has "Post\nAmplifier" in an h1
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════
// 5. ADMIN PAGE — Dashboard
// ═══════════════════════════════════════════

test.describe("Admin dashboard", () => {
  test("shows new campaign form when no campaign", async ({ page }) => {
    await clearStorage(page);
    await setAdminAuth(page);
    await page.goto("/admin");
    await expect(page.getByText("New Campaign")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByPlaceholder("Paste the original post", { exact: false })
    ).toBeVisible();
  });

  test("campaign type selector works", async ({ page }) => {
    await clearStorage(page);
    await setAdminAuth(page);
    await page.goto("/admin");

    const postsBtn = page.getByRole("button", { name: "Posts Only" });
    const commentsBtn = page.getByRole("button", { name: "Comments Only" });
    const bothBtn = page.getByRole("button", { name: "Both" });

    await expect(postsBtn).toBeVisible({ timeout: 10000 });
    await expect(commentsBtn).toBeVisible();
    await expect(bothBtn).toBeVisible();

    // Click Comments Only — source URL field should appear
    await commentsBtn.click();
    await expect(
      page.getByPlaceholder("https://www.linkedin.com/posts/", {
        exact: false,
      })
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows source URL field for comments and both types", async ({
    page,
  }) => {
    await clearStorage(page);
    await setAdminAuth(page);
    await page.goto("/admin");

    // Posts only (default) — no source URL
    await expect(
      page.getByRole("button", { name: "Posts Only" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByPlaceholder("https://www.linkedin.com/posts/", {
        exact: false,
      })
    ).not.toBeVisible();

    // Switch to Both
    await page.getByRole("button", { name: "Both" }).click();
    await expect(
      page.getByPlaceholder("https://www.linkedin.com/posts/", {
        exact: false,
      })
    ).toBeVisible({ timeout: 5000 });
  });

  test("generate button is disabled without required fields", async ({
    page,
  }) => {
    await clearStorage(page);
    await setAdminAuth(page);
    await page.goto("/admin");
    const genBtn = page.getByRole("button", { name: "Generate Content" });
    await expect(genBtn).toBeDisabled({ timeout: 10000 });
  });

  test("shows active campaign preview when campaign exists", async ({
    page,
  }) => {
    await seedCampaign(page);
    await setAdminAuth(page);
    await page.goto("/admin");
    await expect(page.getByText("Active Campaign")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Live")).toBeVisible();
  });

  test("sign out works", async ({ page }) => {
    await clearStorage(page);
    await setAdminAuth(page);
    await page.goto("/admin");
    await page.getByText("Sign out").click({ timeout: 10000 });
    await expect(page.getByText("Welcome back")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Employee View link navigates to /post", async ({ page }) => {
    await clearStorage(page);
    await setAdminAuth(page);
    await page.goto("/admin");
    await page.getByText("Employee View").click({ timeout: 10000 });
    await page.waitForURL("**/post", { timeout: 10000 });
    expect(page.url()).toContain("/post");
  });
});

// ═══════════════════════════════════════════
// 6. API ROUTES
// ═══════════════════════════════════════════

test.describe("API routes", () => {
  test("POST /api/auth returns success for correct password", async ({
    request,
  }) => {
    const res = await request.post("/api/auth", {
      data: { password: "admin123" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("POST /api/auth returns 401 for wrong password", async ({
    request,
  }) => {
    const res = await request.post("/api/auth", {
      data: { password: "wrong" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/generate returns 400 without required fields", async ({
    request,
  }) => {
    const res = await request.post("/api/generate", {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

// ═══════════════════════════════════════════
// 7. CROSS-PAGE NAVIGATION
// ═══════════════════════════════════════════

test.describe("Navigation", () => {
  test("posts-only campaign: comment page links to posts", async ({
    page,
  }) => {
    await seedCampaign(page, { campaignType: "posts" });
    await page.goto("/comment");
    const goToPosts = page.getByText("Go to Posts");
    await expect(goToPosts).toBeVisible({ timeout: 10000 });
    await goToPosts.click();
    await page.waitForURL("**/post", { timeout: 10000 });
    expect(page.url()).toContain("/post");
  });

  test("comments-only campaign: post page links to comments", async ({
    page,
  }) => {
    await seedCampaign(page, { campaignType: "comments" });
    await page.goto("/post");
    const goToComments = page.getByText("Go to Comments");
    await expect(goToComments).toBeVisible({ timeout: 10000 });
    await goToComments.click();
    await page.waitForURL("**/comment", { timeout: 10000 });
    expect(page.url()).toContain("/comment");
  });
});

// ═══════════════════════════════════════════
// 8. VISUAL / LAYOUT CHECKS
// ═══════════════════════════════════════════

test.describe("Visual and layout", () => {
  test("post page has ambient background", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/post");
    const root = page.locator(".ambient-bg");
    await expect(root).toBeVisible({ timeout: 10000 });
  });

  test("comment page has ambient background", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/comment");
    const root = page.locator(".ambient-bg");
    await expect(root).toBeVisible({ timeout: 10000 });
  });

  test("post page is responsive on mobile", async ({ page }) => {
    await seedCampaign(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/post");
    await expect(page.getByText("Your unique post")).toBeVisible({
      timeout: 10000,
    });
  });

  test("comment page is responsive on mobile", async ({ page }) => {
    await seedCampaign(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/comment");
    await expect(page.getByText("Your unique comment")).toBeVisible({
      timeout: 10000,
    });
  });

  test("admin login is responsive on mobile", async ({ page }) => {
    await clearStorage(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/admin");
    await expect(page.getByText("Welcome back")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeVisible();
  });
});

// ═══════════════════════════════════════════
// 9. CAMPAIGN DETAIL PAGE
// ═══════════════════════════════════════════

test.describe("Campaign detail page", () => {
  test("shows Campaign not found for invalid id", async ({ page }) => {
    await clearStorage(page);
    await page.goto("/campaigns/nonexistent-id");
    await expect(page.getByText("Campaign not found")).toBeVisible({
      timeout: 10000,
    });
  });

  test("loads campaign and shows tabs", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/campaigns/test-campaign-1");
    await expect(page.getByText("Get a Post")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Get a Comment")).toBeVisible();
  });

  test("switching tabs works", async ({ page }) => {
    await seedCampaign(page);
    await page.goto("/campaigns/test-campaign-1");
    await expect(page.getByText("Your unique post")).toBeVisible({
      timeout: 10000,
    });
    await page.getByText("Get a Comment").click();
    await expect(page.getByText("Your unique comment")).toBeVisible({
      timeout: 10000,
    });
  });
});
