import type { APIRoute } from 'astro'
import { generateBlogPost } from '../../lib/ai/groq'
import { db, schema } from '../../lib/db'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// Rate limiting: max 3 posts per day
const RATE_LIMIT = 3
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours

// Simple in-memory rate limiter (in production, use Upstash Redis)
const rateLimitMap: Record<string, number[]> = {}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userAttempts = rateLimitMap[userId] || []

  // Filter out attempts older than 24 hours
  const recentAttempts = userAttempts.filter((time) => now - time < RATE_LIMIT_WINDOW)

  if (recentAttempts.length >= RATE_LIMIT) {
    return false
  }

  rateLimitMap[userId] = [...recentAttempts, now]
  return true
}

export const POST: APIRoute = async (context) => {
  try {
    // Validate request
    const body = await context.request.json() as {
      topic: string
      category: 'agentic-ai' | 'ai-engineering' | 'business-automation' | 'seo-geo'
      style?: 'technical' | 'casual' | 'professional'
      targetWordCount?: number
      userId?: string
      publish?: boolean
    }

    if (!body.topic || !body.category) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: topic, category' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use provided userId or generate a temporary one
    const userId = body.userId || 'anonymous'

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Maximum 3 posts per 24 hours.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate blog post
    const generated = await generateBlogPost({
      topic: body.topic,
      category: body.category,
      style: body.style || 'professional',
      targetWordCount: body.targetWordCount || 1500,
    })

    // Record generation in history
    const historyId = uuidv4()
    await db.insert(schema.aiGenerationHistory).values({
      id: historyId,
      userId: userId as any,
      topic: body.topic,
      prompt: `Generate blog post about ${body.topic} in ${body.category}`,
      modelUsed: 'groq-mixtral-8x7b',
      generatedContent: generated.content,
      tokensUsed: generated.tokensUsed,
      generationTimeMs: generated.generationTimeMs,
      status: 'success',
    })

    // Publish if requested
    let postId = null
    if (body.publish) {
      const newPost = {
        id: uuidv4(),
        title: generated.title,
        slug: generated.slug,
        description: generated.description,
        content: generated.content,
        authorId: userId as any,
        isAiGenerated: true,
        status: 'published',
        publishedAt: new Date(),
      }

      await db.insert(schema.blogPosts).values(newPost as any)

      // Update history with post ID
      await db
        .update(schema.aiGenerationHistory)
        .set({ blogPostId: newPost.id as any })
        .where(eq(schema.aiGenerationHistory.id, historyId as any))

      postId = newPost.id
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          title: generated.title,
          slug: generated.slug,
          description: generated.description,
          preview: generated.content.substring(0, 500) + '...',
          tokensUsed: generated.tokensUsed,
          generationTimeMs: generated.generationTimeMs,
          published: body.publish,
          postId,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return new Response(
      JSON.stringify({
        error: 'Failed to generate blog post',
        details: errorMessage,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
