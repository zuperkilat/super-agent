import type { APIRoute } from 'astro'
import { generateBlogPost } from '../../lib/ai/groq'

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

// Use built-in crypto for UUIDs to avoid server-only deps at build time.
const uuid = () => crypto.randomUUID()

// Resolve server-only modules at request time so static builds don't choke on them.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

function getDb() {
  try {
    const { db, schema } = require('../../lib/db')
    return { db, schema }
  } catch (error) {
    console.warn('Database module unavailable in current build context:', error)
    return { db: null, schema: null }
  }
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

    // Record generation in history if DB is available
    const { db, schema } = getDb()
    let historyId = null as string | null
    if (db && schema) {
      historyId = uuid()
      try {
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
      } catch (error) {
        console.warn('Failed to record generation history:', error)
      }
    }

    // Publish if requested
    let postId = null
    if (body.publish && db && schema) {
      const newPost = {
        id: uuid(),
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
      if (postId) {
        try {
          await (db as any)
            .update(schema.aiGenerationHistory)
            .set({ blogPostId: newPost.id as any })
            .where({ id: historyId as string })
        } catch (error) {
          console.warn('Failed to link generation history:', error)
        }
      }

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
