import { NextRequest, NextResponse } from "next/server";
import { deduplicateTexts, shuffle } from "@/lib/similarity";
import { GenerateRequest } from "@/lib/types";

const BATCH_SIZE = 30; // posts per parallel API call

async function callGPTJson<T>(
  messages: { role: string; content: string }[],
  schema: { name: string; schema: object }
): Promise<T> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.APP_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      temperature: 1.1,
      max_tokens: 32768,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schema.name,
          strict: true,
          schema: schema.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as T;
}

const POSTS_SCHEMA = {
  name: "posts_response",
  schema: {
    type: "object",
    properties: {
      posts: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["posts"],
    additionalProperties: false,
  },
};

const COMMENTS_SCHEMA = {
  name: "comments_response",
  schema: {
    type: "object",
    properties: {
      comments: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["comments"],
    additionalProperties: false,
  },
};

const POSTS_SYSTEM = `You are a world-class LinkedIn ghostwriter with deep expertise in MARKETING PSYCHOLOGY and CONTENT WRITING. The current year is 2026 — use current trends, references, and language that feel fresh and relevant to today.

🧠 MARKETING PSYCHOLOGY SKILLS:
- AIDA framework (Attention → Interest → Desire → Action)
- Social proof & authority bias — weave in credibility signals
- Scarcity & urgency — create FOMO without being salesy
- Reciprocity — lead with value before asking
- Pattern interrupt — break the scroll with unexpected hooks
- Emotional triggers — aspiration, belonging, curiosity, fear of missing out
- Anchoring — set mental frames early in the post
- The Zeigarnik effect — open loops that compel reading
- Bandwagon effect — "everyone is doing this" framing
- Loss aversion — frame what they'll miss, not just what they'll gain

✍️ CONTENT WRITING SKILLS:
- Hook mastery — first line must STOP the scroll (bold claim, question, stat, controversy, story)
- Rhythm & pacing — mix short punchy lines with flowing paragraphs
- White space — use line breaks for readability and dramatic effect
- Power words — "discover", "proven", "exclusive", "transform", "unlock"
- Storytelling frameworks — hero's journey, before/after, problem-agitate-solve
- CTA variety — question CTAs, soft CTAs, bold CTAs, story CTAs, no CTA at all
- Tone shifting — formal authority, casual friend, inspiring leader, curious learner, bold contrarian
- Formatting variety — bullet lists, numbered lists, one-liners, long-form narratives, tweet-style

🔗 URLs (IMPORTANT):
- If the original post contains any URL/link, you MUST include that exact URL in EVERY generated post
- Do NOT modify, shorten, or remove URLs from the source post
- Place the URL naturally within the post (usually near the end or as a CTA)
- Do NOT add @mentions or tag anyone — no @ symbols at all

RULES:
- Each post MUST use a DIFFERENT psychological trigger as its core driver
- Each post MUST have a DIFFERENT opening hook style
- Each post MUST have a DIFFERENT structure and length (some 3 lines, some 8+ lines)
- Vary emoji usage: some heavy, some light, some zero
- Vary tone dramatically across posts
- NO two posts should feel like they came from the same template
- Keep posts concise (3-8 lines each) to maximize output count
- Write like a HUMAN — include personality, opinions, raw energy

OUTPUT: Return a JSON object with a "posts" array. Each element is one complete post as a string.`;

const COMMENTS_SYSTEM = `You are a LinkedIn engagement strategist with expertise in MARKETING PSYCHOLOGY and COMMUNITY BUILDING. The current year is 2026 — use current trends and references.

🧠 PSYCHOLOGY OF ENGAGEMENT:
- Comments that trigger reply chains (ask follow-up questions)
- Social validation — make the poster feel seen and appreciated
- Curiosity gaps — hint at a related insight without fully explaining
- Personal connection — share a brief relatable experience
- Intellectual contribution — add a new angle the post didn't cover
- Constructive challenge — respectfully push back to spark discussion
- Emotional resonance — mirror the emotion of the post authentically

✍️ COMMENT TYPES TO MIX:
1. Insightful addition — "This reminds me of... [new angle]"
2. Curious question — "Have you considered... / What's your take on..."
3. Personal experience — "We tried this at my company and..."
4. Supportive amplification — "Bookmarking this because..."
5. Thought-provoking challenge — "I mostly agree but wonder about..."
6. Social connector — "this is exactly what we discussed with the team"
7. Quick appreciation with substance — specific praise on ONE point
8. Data/stat dropper — adds a relevant fact or figure

RULES:
- Do NOT use @mentions or tag anyone — no @ symbols at all
- If the original post contains a URL/link, include that exact URL in comments where relevant
- NEVER generic ("Great post!", "Love this!", "So true!")
- Each comment must add VALUE or spark CONVERSATION
- Keep short: 1-2 sentences each to maximize output count
- Sound like a real professional, not a bot
- Use natural language — contractions, casual phrasing, genuine reactions

OUTPUT: Return a JSON object with a "comments" array. Each element is one complete comment as a string.`;

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      mainPost,
      postGoal,
      numberOfVariations,
      numberOfComments,
      existingPosts = [],
      existingComments = [],
    } = body;

    if (!mainPost || !postGoal) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const commentCount = numberOfComments || 0;
    const postCount = numberOfVariations || 0;

    const allPromises: Promise<unknown>[] = [];
    let commentsIndex = -1;

    // ── Post batches (parallel) — skip if 0 ──
    const postBatchIndices: number[] = [];
    if (postCount > 0) {
      const numBatches = Math.ceil(postCount / BATCH_SIZE);
      for (let i = 0; i < numBatches; i++) {
        const batchCount = Math.min(BATCH_SIZE, postCount - i * BATCH_SIZE);
        const batchNum = i + 1;
        postBatchIndices.push(allPromises.length);
        allPromises.push(
          callGPTJson<{ posts: string[] }>(
            [
              { role: "system", content: POSTS_SYSTEM },
              {
                role: "user",
                content: `ORIGINAL POST:\n"""\n${mainPost}\n"""\n\nGOAL: ${postGoal}\n\nBatch ${batchNum} of ${numBatches}. Generate EXACTLY ${batchCount} unique posts. Each must use a different psychological trigger and hook style. Keep each post 3-8 lines. ${batchNum > 1 ? "Make these COMPLETELY DIFFERENT from other batches — use fresh angles, hooks, and tones." : "Go."}`,
              },
            ],
            POSTS_SCHEMA
          )
        );
      }
    }

    // ── Comments call — skip if 0 ──
    if (commentCount > 0) {
      commentsIndex = allPromises.length;
      allPromises.push(
        callGPTJson<{ comments: string[] }>(
          [
            { role: "system", content: COMMENTS_SYSTEM },
            {
              role: "user",
              content: `POST:\n"""\n${mainPost}\n"""\n\nGOAL: ${postGoal}\n\nGenerate EXACTLY ${commentCount} unique comments. Keep each 1-2 sentences max. Mix all 8 comment types. Go.`,
            },
          ],
          COMMENTS_SCHEMA
        )
      );
    }

    // ── Run ALL in parallel ──
    const results = await Promise.all(allPromises);

    const postBatchResults = postBatchIndices.map(
      (idx) => results[idx] as { posts: string[] }
    );
    const commentsResult =
      commentsIndex >= 0
        ? (results[commentsIndex] as { comments: string[] })
        : { comments: [] };

    const rawPosts = postBatchResults
      .flatMap((r) => r.posts)
      .filter((p) => p.length > 20);

    const rawComments = commentsResult.comments.filter((c) => c.length > 5);

    console.log(
      `API calls: ${postBatchIndices.length} post batches + ${commentsIndex >= 0 ? 1 : 0} comments = ${allPromises.length} total | Raw: ${rawPosts.length} posts, ${rawComments.length} comments`
    );

    // Deduplicate and shuffle
    const dedupedPosts = deduplicateTexts([...existingPosts, ...rawPosts]);
    const dedupedComments = deduplicateTexts([
      ...existingComments,
      ...rawComments,
    ]);

    const newPosts = shuffle(
      dedupedPosts.filter((p) => !existingPosts.includes(p))
    );
    const newComments = shuffle(
      dedupedComments.filter((c) => !existingComments.includes(c))
    );

    return NextResponse.json({
      posts: newPosts,
      comments: newComments,
    });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
