import { NextRequest, NextResponse } from "next/server";

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
          // Extract text content from the oEmbed HTML
          const textMatch = data.html.match(
            /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/
          );
          if (textMatch) {
            const text = textMatch[1]
              .replace(/<[^>]+>/g, "")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .trim();

            if (text) {
              return NextResponse.json({ text, method: "oembed" });
            }
          }
        }
      }
    } catch {
      // oEmbed failed, try next method
    }

    // Attempt 2: Direct fetch with browser User-Agent
    try {
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const ogMatch = html.match(
          /<meta\s+property="og:description"\s+content="([^"]*)"/
        ) || html.match(
          /<meta\s+content="([^"]*)"\s+property="og:description"/
        );

        if (ogMatch) {
          const text = ogMatch[1]
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

          if (text) {
            return NextResponse.json({ text, method: "og:description" });
          }
        }
      }
    } catch {
      // Direct fetch failed
    }

    // Both methods failed
    return NextResponse.json({
      text: null,
      error: "Could not fetch post content",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
