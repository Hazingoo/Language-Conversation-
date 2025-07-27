import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { message } = await req.json()

        switch (message.type) {
            case 'status-update':
                console.log(`Call ${message.call.id}: ${message.call.status}`)
                break

            case 'transcript':
                console.log(`${message.role}: ${message.transcript}`)
                break

            case 'function-call':
                return handleFunctionCall(message, req)

            default:
                console.log('Unknown message type:', message.type)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}

async function handleFunctionCall(message: any, req: Request) {
    const { functionCall } = message

    switch (functionCall.name) {
        case 'get_language_curriculum':
            // Return curriculum information for the target language
            const language = functionCall.parameters.language || 'French'
            const curriculum = await getCurriculumForLanguage(language)
            return NextResponse.json({ result: curriculum })

        case 'provide_correction':
            // Provide language correction
            const correction = {
                original: functionCall.parameters.original,
                corrected: functionCall.parameters.corrected,
                explanation: functionCall.parameters.explanation
            }
            return NextResponse.json({ result: correction })

        case 'get_cultural_context':
            // Provide cultural context for the language
            const context = await getCulturalContext(functionCall.parameters.topic, functionCall.parameters.language)
            return NextResponse.json({ result: context })

        default:
            return NextResponse.json({ error: 'Unknown function' }, { status: 400 })
    }
}

async function getCurriculumForLanguage(language: string) {
    // This would integrate with your existing curriculum agent
    const curriculumData = {
        language,
        scenarios: ['Cafe Order', 'Hotel Check-in', 'Shopping'],
        difficulty: 'Beginner',
        focus_areas: ['Greetings', 'Basic phrases', 'Numbers', 'Food vocabulary']
    }

    return curriculumData
}

async function getCulturalContext(topic: string, language: string) {
    const culturalInfo = {
        topic,
        language,
        context: `Cultural information about ${topic} in ${language} culture`,
        tips: [`Tip 1 about ${topic}`, `Tip 2 about ${topic}`]
    }

    return culturalInfo
} 