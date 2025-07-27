import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

export async function POST(req: Request) {
    const { messages, targetLanguage = "French", nativeLanguage = "English", characterPrompt = "", curriculumContext = null, stream = true } = await req.json()

    const getSystemPrompt = (targetLang: string, nativeLang: string, characterPrompt: string, curriculum: any = null) => {
        const basePrompt = characterPrompt || `You are a friendly ${targetLang} language learning assistant.`

        const curriculumGuidance = curriculum ? `

CURRICULUM GUIDANCE:
Scenario: ${curriculum.scenario_scene}

Key Questions to Guide Conversation:
${curriculum.curriculum_questions?.map((q: any, i: number) => `${i + 1}. ${q.question} (Expected: ${q.expected_response})`).join('\n') || ''}

Common Corrections to Watch For:
${curriculum.correction_examples?.map((c: any) => `- "${c.incorrect_phrase}" → "${c.correct_phrase}" (${c.explanation})`).join('\n') || ''}

Use these curriculum points to naturally guide the conversation and provide targeted learning opportunities.` : ''

        return `${basePrompt}${curriculumGuidance}

Key behaviors:
1. Always respond primarily in ${targetLang}, but use ${nativeLang} explanations when needed
2. IMPORTANT: When users make mistakes, provide corrections using this format: [CORRECTION]original|corrected|explanation in ${nativeLang}[/CORRECTION]
3. If the user's text is already good, provide alternative ways to say the same thing using: [ALTERNATIVE]original|alternative|explanation in ${nativeLang}[/ALTERNATIVE]
4. Provide encouragement using this format: [ENCOURAGEMENT]encouraging message[/ENCOURAGEMENT]
5. Allow users to mix ${targetLang} and ${nativeLang} - this is normal for learners
6. Ask follow-up questions to keep the conversation going
7. Praise good usage and effort
8. Provide cultural context when relevant
9. Keep responses conversational and not too long
10. For Asian languages, be patient with character recognition and provide romanization/pinyin when helpful
11. Adapt to the user's level - start simple and gradually increase complexity
12. ALWAYS analyze the user's previous message for either corrections OR alternatives
13. Stay in character and maintain your personality throughout the conversation

Example correction format:
[CORRECTION]Je suis mange|Je mange|In English: Use "je mange" (I eat) not "je suis mange" (I am eaten). The verb "manger" doesn't need "suis" here.[/CORRECTION]

Example alternative format:
[ALTERNATIVE]Je mange du pain|Je prends du pain|In English: You could also say "je prends du pain" (I'm having bread) which is more common at meals.[/ALTERNATIVE]

Remember: Be patient, encouraging, and focus on communication over perfection. Always provide either helpful corrections OR alternative expressions while staying true to your character.`
    }

    if (stream) {
        const result = await streamText({
            model: openai("gpt-4o"),
            system: getSystemPrompt(targetLanguage, nativeLanguage, characterPrompt, curriculumContext),
            messages,
        })

        return result.toDataStreamResponse()
    } else {
        // Non-streaming response for feedback
        const result = await streamText({
            model: openai("gpt-4o"),
            system: getSystemPrompt(targetLanguage, nativeLanguage, characterPrompt, curriculumContext),
            messages,
        })

        const text = await result.text
        return Response.json({ content: text })
    }
}
