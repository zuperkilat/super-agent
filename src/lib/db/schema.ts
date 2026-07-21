import { pgTable, text, boolean, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Blog Posts table
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  content: text('content').notNull(),
  authorId: uuid('author_id').notNull(),
  isAiGenerated: boolean('is_ai_generated').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  status: text('status').default('draft'),
})

// AI Generation History table
export const aiGenerationHistory = pgTable('ai_generation_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogPostId: uuid('blog_post_id'),
  userId: uuid('user_id').notNull(),
  topic: text('topic').notNull(),
  prompt: text('prompt').notNull(),
  modelUsed: text('model_used').notNull(),
  generatedContent: text('generated_content'),
  tokensUsed: integer('tokens_used'),
  generationTimeMs: integer('generation_time_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  status: text('status').default('success'),
  errorMessage: text('error_message'),
})

// Relations
export const blogPostsRelations = relations(blogPosts, ({ many }) => ({
  generationHistory: many(aiGenerationHistory),
}))

export const aiGenerationHistoryRelations = relations(aiGenerationHistory, ({ one }) => ({
  blogPost: one(blogPosts, {
    fields: [aiGenerationHistory.blogPostId],
    references: [blogPosts.id],
  }),
}))
