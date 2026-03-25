import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, "demo-screenshots");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Realistic mock data
const MOCK_CAMPAIGN = {
  id: "demo-campaign-001",
  mainPost: `🚀 We're hiring! Join our engineering team and help build the future of AI-powered analytics.

At TechCorp, we believe in:
• Remote-first culture
• Cutting-edge technology stack
• Impact-driven development

We're looking for Senior Engineers, ML Engineers, and Product Designers.

If you're passionate about making data accessible to everyone, we'd love to hear from you.

Drop a comment or DM me to learn more! 🙌

#hiring #engineering #AI #remotework #techjobs`,
  postGoal: "Hiring",
  createdAt: new Date().toISOString(),
  published: true,
  posts: [
    `The best teams aren't built on perks — they're built on purpose.\n\nAt TechCorp, our engineering team is solving one of the hardest problems in data: making complex analytics accessible to everyone, not just data scientists.\n\nWe're growing and looking for Senior Engineers, ML Engineers, and Product Designers who want to work remotely, ship fast, and make real impact.\n\nInterested? Let's talk.`,

    `I used to think "remote-first" was just a buzzword.\n\nThen I joined TechCorp.\n\nHere, remote-first means:\n→ Async communication by default\n→ No "you should've been in that meeting" culture\n→ Trust over surveillance\n→ Results over hours logged\n\nAnd we're hiring. Senior Engineers. ML Engineers. Product Designers.\n\nIf you want to build the future of AI analytics from wherever you do your best work — DM me.`,

    `Hot take: The best engineering candidates aren't on job boards.\n\nThey're scrolling LinkedIn right now, wondering if there's something better out there.\n\nThis is your sign. TechCorp is hiring for roles that actually matter:\n\n✅ Senior Engineers — build our core platform\n✅ ML Engineers — push the boundaries of AI analytics\n✅ Product Designers — shape how millions interact with data\n\nRemote-first. Impact-driven. No bureaucracy.\n\nDrop a comment if you want details.`,

    `What if your next role let you work on cutting-edge AI while living wherever you want?\n\nThat's not hypothetical — that's what we offer at TechCorp.\n\nWe're on a mission to democratize analytics, and we need brilliant people to help us get there. Currently hiring:\n\n• Senior Engineers\n• ML Engineers\n• Product Designers\n\nThe tech stack is modern. The team is exceptional. The impact is real.\n\nCurious? Comment below or send me a message.`,

    `3 things I wish someone told me before joining a startup:\n\n1. Culture isn't ping pong tables — it's how decisions get made\n2. Remote work only works if leadership actually trusts people\n3. The best engineers care about the problem, not just the stack\n\nAt TechCorp, we got all three right. And now we're hiring engineers, ML specialists, and designers who care about building products that make data accessible to everyone.\n\nReach out if this resonates.`,

    `We just opened 12 new roles at TechCorp.\n\nBut I'm not going to list them all. Instead, let me tell you why people stay:\n\n→ They ship code that millions of people use\n→ They work with a team that's genuinely brilliant (and kind)\n→ They have the flexibility to live their lives while building their careers\n\nIf you're a Senior Engineer, ML Engineer, or Product Designer looking for your next chapter — this might be it.\n\nLink in comments.`,

    `Unpopular opinion: Most job posts are terrible.\n\nThey list requirements nobody meets and benefits nobody believes.\n\nSo here's me being real about working at TechCorp:\n\n• The problems are genuinely hard (AI + analytics at scale)\n• We're remote-first and actually mean it\n• You'll ship things that matter, not features nobody asked for\n\nWe're hiring Senior Engineers, ML Engineers, and Product Designers.\n\nNo cover letter needed. Just DM me what excites you about this space.`,

    `"Why would I leave my comfortable FAANG job?"\n\nFair question. Here's my honest answer:\n\nBecause at TechCorp, you won't spend 6 months getting a button color approved. You'll ship real features that real people use to make better decisions with data.\n\nWe're a remote-first team building AI-powered analytics. We're hiring engineers, ML specialists, and designers.\n\nIf you want ownership, speed, and impact — let's chat.`,

    `The future of analytics is being built right now.\n\nAnd we need more builders.\n\nTechCorp is hiring across engineering, ML, and design. We're remote-first, impact-obsessed, and growing fast.\n\nWhat makes us different? We don't just talk about innovation — every quarter, our team ships features that fundamentally change how organizations use data.\n\nIf you want to be part of that, I'd love to hear from you. Comment or DM.`,

    `I've interviewed 200+ candidates this year.\n\nThe ones who stood out weren't the ones with the fanciest resumes. They were the ones who asked: "What problem am I actually solving?"\n\nAt TechCorp, the answer is clear: making AI-powered analytics accessible to every team, everywhere.\n\nWe're hiring people who care about that mission:\n→ Senior Engineers\n→ ML Engineers\n→ Product Designers\n\nRemote-first. No ego. Real impact.\n\nKnow someone perfect? Tag them below.`,

    `Everyone talks about AI. We're actually building it.\n\nTechCorp's analytics platform processes billions of data points daily, and our ML models are getting smarter every week.\n\nBut technology alone isn't enough — we need the right people.\n\nThat's why we're hiring Senior Engineers, ML Engineers, and Product Designers who thrive in remote environments and care deeply about craft.\n\nInterested? My DMs are open.`,

    `What does a great engineering culture actually look like?\n\nAt TechCorp:\n✦ PRs get reviewed in hours, not days\n✦ Engineers own features end-to-end\n✦ We deploy multiple times a day\n✦ Remote work is a feature, not a compromise\n\nWe're growing the team. Looking for Senior Engineers, ML Engineers, and Product Designers.\n\nIf you value autonomy and impact over titles and politics — let's connect.`,
  ],
  comments: [
    `This is exactly the kind of engineering culture I've been looking for. The emphasis on ownership and impact over process really stands out.`,
    `Shared with a few friends who've been exploring remote roles. TechCorp sounds like the real deal.`,
    `What does the interview process look like? I'm always curious about how companies that value craft assess for it.`,
    `I've worked with a few TechCorp engineers before — can confirm the team is as strong as advertised. Great group of people.`,
    `The remote-first approach is what caught my attention. Too many companies say "remote-friendly" but really mean "come to the office 3 days a week." Refreshing to see this.`,
    `AI-powered analytics is such a fascinating space right now. Would love to learn more about the specific problems the ML team is tackling.`,
    `Just sent this to my design lead — she's been wanting to work on something more meaningful. This seems like a great fit.`,
    `Love the transparency here. Most hiring posts are so generic — this actually makes me want to apply.`,
    `What's the tech stack looking like? Always curious about the engineering choices behind platforms processing that much data.`,
    `This resonates. After years at a big company, I'm craving the kind of ownership and speed you're describing.`,
    `Genuine question: how do you maintain team culture and collaboration in a fully remote setup? Any specific practices?`,
    `Bookmarking this. Not looking right now, but TechCorp is definitely on my radar for the future.`,
    `The "no ego" part is so underrated. I've seen brilliant teams held back by politics. Great to see it called out explicitly.`,
    `Do you have roles open in data engineering or is it primarily ML-focused? Would love to explore either way.`,
    `Incredible mission. Making analytics accessible has been one of the biggest unsolved problems in enterprise tech.`,
    `I appreciate that you mentioned Product Designers alongside engineers. So many companies treat design as an afterthought.`,
    `Tagging my colleague — she was just talking about wanting to work in the AI analytics space. This is perfect timing.`,
    `How large is the engineering team currently? Curious about the stage and the kind of problems at this scale.`,
    `Remote-first AND modern tech stack AND meaningful problems? That's the trifecta. Hard to find all three together.`,
    `Really admire how TechCorp approaches hiring. This post alone tells me a lot about the company culture.`,
    `Would love to chat about the Product Designer role. My background is in data visualization — feels like a natural fit.`,
    `Finally, a company that gets it. Trust over surveillance. Results over hours. This is how you attract top talent.`,
    `What excites me most is "features that fundamentally change how organizations use data." That's the kind of impact I want to make.`,
    `Sent this to 3 people. You're going to get some amazing applicants from this post alone.`,
  ],
};

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  if (!fs.existsSync(screenshotDir))
    fs.mkdirSync(screenshotDir, { recursive: true });

  // Clear old screenshots
  for (const f of fs.readdirSync(screenshotDir)) {
    fs.unlinkSync(path.join(screenshotDir, f));
  }

  console.log("\n📸 LinkedIn Post Amplifier — Full Demo\n");
  console.log("═".repeat(50) + "\n");

  // Helper to take screenshots
  let shotNum = 0;
  async function shot(name, opts = {}) {
    shotNum++;
    const filename = `${String(shotNum).padStart(2, "0")}-${name}.png`;
    await page.screenshot({
      path: path.join(screenshotDir, filename),
      fullPage: opts.fullPage ?? false,
    });
    console.log(`   📷 ${filename}`);
  }

  // ═══════════════════════════════════════════════════
  // 1. HOME PAGE — Empty State
  // ═══════════════════════════════════════════════════
  console.log("1. Home Page — Empty State");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await sleep(1200);
  await shot("home-empty");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 2. ADMIN — Login Screen
  // ═══════════════════════════════════════════════════
  console.log("2. Admin — Login Screen");
  await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
  await sleep(1000);
  await shot("admin-login");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 3. ADMIN — Login Error
  // ═══════════════════════════════════════════════════
  console.log("3. Admin — Login Error");
  await page.fill('input[type="password"]', "wrongpassword");
  await page.click("button:has-text('Sign in')");
  await sleep(1000);
  await shot("login-error");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 4. ADMIN — Successful Login
  // ═══════════════════════════════════════════════════
  console.log("4. Admin — Successful Login");
  await page.fill('input[type="password"]', "");
  await page.fill('input[type="password"]', "admin123");
  await page.click("button:has-text('Sign in')");
  await page.waitForSelector("text=Create Campaign", { timeout: 10000 });
  await sleep(1000);
  await shot("admin-dashboard");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 5. ADMIN — Campaign Form Filled
  // ═══════════════════════════════════════════════════
  console.log("5. Admin — Campaign Form Filled");
  await page.waitForSelector("textarea", { timeout: 5000 });
  await page.fill("textarea", MOCK_CAMPAIGN.mainPost);
  await page.selectOption("select", "Hiring");
  await page.fill('input[type="number"]', "50");
  await sleep(600);
  await shot("form-filled");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 6. ADMIN — Generating (real GPT API call)
  // ═══════════════════════════════════════════════════
  console.log("6. Admin — Generating content via GPT API...");
  await page.click("button:has-text('Generate Content')");
  await sleep(2000);
  await shot("generating");

  // Wait for GPT generation to complete (up to 2 minutes)
  try {
    await page.waitForSelector("text=Generated", { timeout: 120000 });
    console.log("   ✅ GPT generation complete!");
  } catch {
    console.log("   ⏳ Generation still running, using mock data as fallback...");
    await page.evaluate((campaign) => {
      localStorage.setItem(
        "linkedin_amplifier_campaigns",
        JSON.stringify([campaign])
      );
    }, MOCK_CAMPAIGN);
    await page.goto("http://localhost:3000/admin", { waitUntil: "networkidle" });
    await page.waitForSelector("text=Create Campaign", { timeout: 10000 }).catch(() => {});
    if (await page.locator('input[type="password"]').isVisible()) {
      await page.fill('input[type="password"]', "admin123");
      await page.click("button:has-text('Sign in')");
      await page.waitForSelector("text=Create Campaign", { timeout: 10000 });
    }
  }
  await sleep(1000);
  console.log("");

  // ═══════════════════════════════════════════════════
  // 7. ADMIN — Campaign Preview (with Publish)
  // ═══════════════════════════════════════════════════
  console.log("7. Admin — Campaign Preview");
  await sleep(500);
  // The preview panel should be visible with the generated content
  await shot("campaign-preview", { fullPage: true });

  // Publish the campaign
  const publishBtn = page.locator("button:has-text('Publish')");
  if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await publishBtn.click();
    await sleep(800);
    console.log("   ✅ Campaign published!");
  }
  console.log("");

  // ═══════════════════════════════════════════════════
  // 8. ADMIN — Manage Tab
  // ═══════════════════════════════════════════════════
  console.log("8. Admin — Manage Campaigns");
  await page.click("button:has-text('Manage')");
  await sleep(800);
  await shot("manage-campaigns");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 9. HOME PAGE — With Published Campaign
  // ═══════════════════════════════════════════════════
  console.log("9. Home Page — With Campaign");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await sleep(1200);
  await shot("home-with-campaign");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 10. CAMPAIGN DETAIL — Posts Tab
  // ═══════════════════════════════════════════════════
  console.log("10. Campaign Detail — Posts Tab");
  // Ensure campaign card is visible, if not — force publish via localStorage
  const cardVisible = await page.locator("a[href*='/campaigns/']").isVisible({ timeout: 3000 }).catch(() => false);
  if (!cardVisible) {
    console.log("   ⚡ Ensuring campaign is published...");
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("linkedin_amplifier_campaigns") || "[]");
      if (data.length > 0) {
        data[0].published = true;
        localStorage.setItem("linkedin_amplifier_campaigns", JSON.stringify(data));
      }
    });
    await page.reload({ waitUntil: "networkidle" });
    await sleep(1000);
  }
  await page.click("a[href*='/campaigns/']");
  await page.waitForURL("**/campaigns/**", { timeout: 10000 });
  await sleep(1200);
  await shot("detail-posts");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 11. CAMPAIGN DETAIL — Full Posts View
  // ═══════════════════════════════════════════════════
  console.log("11. Campaign Detail — Full Page (scrolled)");
  await shot("detail-posts-full", { fullPage: true });
  console.log("");

  // ═══════════════════════════════════════════════════
  // 12. COPY A POST
  // ═══════════════════════════════════════════════════
  console.log("12. Copying a Post");
  // Hover over first post for visual effect, then click copy
  const firstCopy = page.locator("button:has-text('Copy')").first();
  await firstCopy.hover();
  await sleep(400);
  await firstCopy.click();
  await sleep(800);
  await shot("post-copied");
  console.log("");

  // Copy a second post too
  const secondCopy = page.locator("button:has-text('Copy')").first();
  await secondCopy.click();
  await sleep(500);

  // ═══════════════════════════════════════════════════
  // 13. COMMENTS TAB
  // ═══════════════════════════════════════════════════
  console.log("13. Campaign Detail — Comments Tab");
  await page.click("button:has-text('Comments')");
  await sleep(1000);
  await shot("detail-comments");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 14. COMMENTS — Full Page
  // ═══════════════════════════════════════════════════
  console.log("14. Comments — Full Page");
  await shot("comments-full", { fullPage: true });
  console.log("");

  // ═══════════════════════════════════════════════════
  // 15. SEARCH FEATURE
  // ═══════════════════════════════════════════════════
  console.log("15. Search Feature");
  await page.click("button:has-text('Posts')");
  await sleep(500);
  await page.fill('input[placeholder*="Search"]', "remote");
  await sleep(1000);
  await shot("search-results");
  console.log("");

  // ═══════════════════════════════════════════════════
  // 16. USED POSTS STATE
  // ═══════════════════════════════════════════════════
  console.log("16. Used Posts Tracking");
  await page.fill('input[placeholder*="Search"]', "");
  await sleep(800);
  await shot("used-tracking", { fullPage: true });
  console.log("");

  // ═══════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════
  await browser.close();

  console.log("═".repeat(50));
  console.log(`\n🎉 Demo complete! ${shotNum} screenshots saved.\n`);
  console.log(`📁 ${screenshotDir}/\n`);

  // List all screenshots
  const files = fs.readdirSync(screenshotDir).sort();
  files.forEach((f) => {
    const size = (fs.statSync(path.join(screenshotDir, f)).size / 1024).toFixed(0);
    console.log(`   ${f} (${size} KB)`);
  });
  console.log("");
})();
