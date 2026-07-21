import Groq from 'groq-sdk'

const groqApiKey = process.env.GROQ_API_KEY

let groq: any = null

if (groqApiKey) {
  groq = new Groq({
    apiKey: groqApiKey,
  })
}

export interface GenerateBlogPostOptions {
  topic: string
  category: 'agentic-ai' | 'ai-engineering' | 'business-automation' | 'seo-geo'
  style?: 'technical' | 'casual' | 'professional'
  targetWordCount?: number
}

export interface GeneratedBlogPost {
  title: string
  slug: string
  description: string
  content: string
  tokensUsed: number
  generationTimeMs: number
}

export async function generateBlogPost(
  options: GenerateBlogPostOptions
): Promise<GeneratedBlogPost> {
  if (!groq || !groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set. Please configure it in your Vercel project settings.')
  }

  const startTime = Date.now()

  const categoryDescriptions: Record<string, string> = {
    'agentic-ai': 'autonomous AI agents, multi-agent systems, reasoning, tool calling',
    'ai-engineering': 'production ML systems, model fine-tuning, deployment, optimization',
    'business-automation': 'workflow automation, process improvement, ROI calculations',
    'seo-geo': 'search engine optimization, geo-targeting, local SEO strategies',
  }

  const style = options.style || 'professional'
  const wordCount = options.targetWordCount || 1500

  const prompt = `You are an expert technical writer specializing in AI, engineering, and business automation.

Write a comprehensive blog post about: "${options.topic}"

Category: ${options.category} (${categoryDescriptions[options.category]})
Style: ${style}
Target word count: approximately ${wordCount} words

The post should:
1. Start with a compelling hook or introduction
2. Clearly explain the concept with real-world examples
3. Include practical insights and best practices
4. Have 3-4 main sections with subheadings
5. End with actionable takeaways

Format your response as valid Markdown with proper heading hierarchy. Include code examples where relevant.
Do not include frontmatter or any metadata - just the markdown content starting with the title as # Heading.`

  const message = await groq.messages.create({
    model: 'mixtral-8x7b-32768',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const generationTimeMs = Date.now() - startTime
  const content =
    message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse the generated markdown to extract title
  const lines = content.split('\n')
  let title = ''
  let bodyContent = content

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      title = lines[i].replace('# ', '').trim()
      bodyContent = lines.slice(i + 1).join('\n').trim()
      break
    }
  }

  if (!title) {
    title = options.topic
  }

  // Generate slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  // Generate description from first paragraph
  const firstParagraph = bodyContent
    .split('\n\n')[0]
    .replace(/[#*_`]/g, '')
    .trim()
  const description = firstParagraph.substring(0, 160) + '...'

  return {
    title,
    slug,
    description,
    content: bodyContent,
    tokensUsed: message.usage.output_tokens + message.usage.input_tokens,
    generationTimeMs,
  }
}

export async function refineContent(
  content: string,
  instruction: string
): Promise<string> {
  if (!groq || !groqApiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set. Please configure it in your Vercel project settings.')
  }

  const message = await groq.messages.create({
    model: 'mixtral-8x7b-32768',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Please refine the following content based on this instruction: "${instruction}"\n\nContent:\n${content}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}
