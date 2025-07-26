import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

const SuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      start: z.number().describe("Start position of the text to correct"),
      end: z.number().describe("End position of the text to correct"),
      original: z.string().describe("Original text that needs correction"),
      suggestion: z.string().describe("Suggested correction"),
      type: z.enum(["grammar", "vocabulary", "spelling"]).describe("Type of correction needed"),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const { text, targetLanguage = "French", nativeLanguage = "English" } = await req.json()

    if (!text || text.trim().length < 3) {
      return Response.json({ suggestions: [] })
    }

    const result = await generateObject({
      model: openai("gpt-4o"),
      system: `You are a ${targetLanguage} language learning assistant that provides real-time corrections and suggestions as users type.

Analyze the given text and identify areas for improvement. Focus on:
1. Grammar mistakes
2. Better vocabulary choices
3. Spelling errors
4. More natural expressions

Provide suggestions that help learners improve their ${targetLanguage} while being encouraging. If the text mixes ${targetLanguage} and ${nativeLanguage}, that's normal for learners.

Return suggestions with precise character positions for highlighting. Only suggest improvements that would genuinely help the learner.`,
      prompt: `Analyze this text for ${targetLanguage} learning improvements: "${text}"`,
      schema: SuggestionSchema,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error("Analysis error:", error)
    return Response.json({ suggestions: [] })
  }
}
