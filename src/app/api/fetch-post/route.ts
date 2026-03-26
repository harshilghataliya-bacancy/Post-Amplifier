import { NextRequest, NextResponse } from "next/server";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function isLoginWall(text: string): boolean {
  const blockedPhrases = [
    "Sign in or join now",
    "sign in to view",
    "Log in or sign up",
    "Join now to see",
  ];
  return blockedPhrases.some((p) => text.toLowerCase().includes(p.toLowerCase()));
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Attempt 1: LinkedIn oEmbed API
    try {
      const oembedUrl = `https://www.linkedin.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const oembedRes = await fetch(oembedUrl);

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.html) {
          const textMatch = data.html.match(
            /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/
          );
          if (textMatch) {
            const text = decodeHtmlEntities(textMatch[1].replace(/<[^>]+>/g, ""));
            if (text && !isLoginWall(text)) {
              return NextResponse.json({ text, method: "oembed" });
            }
          }
        }
      }
    } catch {
      // oEmbed failed, try next method
    }

    // Attempt 2: Fetch as Googlebot (LinkedIn serves full content to crawlers)
    const userAgents = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    ];

    for (const ua of userAgents) {
      try {
        const pageRes = await fetch(url, {
          headers: {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          redirect: "follow",
        });

        if (!pageRes.ok) continue;
        const html = await pageRes.text();

        // Try og:description first
        const ogMatch =
          html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/) ||
          html.match(/<meta\s+content="([^"]*)"\s+property="og:description"/);

        if (ogMatch) {
          const text = decodeHtmlEntities(ogMatch[1]);
          if (text && !isLoginWall(text)) {
            return NextResponse.json({ text, method: "og:description" });
          }
        }

        // Try description meta tag
        const descMatch =
          html.match(/<meta\s+name="description"\s+content="([^"]*)"/) ||
          html.match(/<meta\s+content="([^"]*)"\s+name="description"/);

        if (descMatch) {
          const text = decodeHtmlEntities(descMatch[1]);
          if (text && !isLoginWall(text)) {
            return NextResponse.json({ text, method: "meta-description" });
          }
        }

        // Try twitter:description
        const twitterMatch =
          html.match(/<meta\s+(?:name|property)="twitter:description"\s+content="([^"]*)"/) ||
          html.match(/<meta\s+content="([^"]*)"\s+(?:name|property)="twitter:description"/);

        if (twitterMatch) {
          const text = decodeHtmlEntities(twitterMatch[1]);
          if (text && !isLoginWall(text)) {
            return NextResponse.json({ text, method: "twitter:description" });
          }
        }
      } catch {
        continue;
      }
    }

    // All methods failed — return helpful message
    return NextResponse.json({
      text: null,
      error: "Could not fetch post content automatically. Please paste the post content manually.",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
