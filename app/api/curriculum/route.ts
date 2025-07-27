import { NextResponse } from 'next/server'

interface CurriculumRequest {
    target_language: string
    scenario: string
}

interface CurriculumQuestion {
    question: string
    expected_response: string
}

interface CorrectionExample {
    incorrect_phrase: string
    correct_phrase: string
    explanation: string
}

interface CurriculumResponse {
    scenario_scene: string
    curriculum_questions: CurriculumQuestion[]
    correction_examples: CorrectionExample[]
}

export async function POST(req: Request) {
    try {
        const { target_language, scenario } = await req.json() as CurriculumRequest

        if (!target_language || !scenario) {
            return NextResponse.json(
                { error: 'Both target_language and scenario are required' },
                { status: 400 }
            )
        }

        // Try to call the curriculum agent API
        try {
            console.log('Attempting to connect to curriculum agent at http://localhost:8000/generate-curriculum')

            // First test if the server is reachable
            console.log('Testing health endpoint...')
            const healthCheck = await fetch('http://127.0.0.1:8000/health', {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            })

            console.log('Health check response status:', healthCheck.status)

            if (!healthCheck.ok) {
                throw new Error(`Health check failed with status: ${healthCheck.status}`)
            }

            console.log('Health check passed, proceeding with curriculum request')

            const response = await fetch('http://127.0.0.1:8000/generate-curriculum', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target_language,
                    scenario,
                }),
                // Add timeout to prevent hanging
                signal: AbortSignal.timeout(10000), // 10 second timeout
            })

            console.log('Curriculum agent response status:', response.status)

            if (!response.ok) {
                throw new Error(`Curriculum API responded with status: ${response.status}`)
            }

            const curriculumData: CurriculumResponse = await response.json()
            console.log('Successfully received curriculum data from agent')
            return NextResponse.json(curriculumData)

        } catch (fetchError) {
            console.warn('Curriculum agent not available, falling back to default curriculum:', fetchError)

            // Fallback curriculum when the service is not available
            const fallbackCurriculum: CurriculumResponse = {
                scenario_scene: `You are in a ${scenario.toLowerCase()} scenario, practicing ${target_language}. This is a great opportunity to improve your language skills through real-world conversation.`,
                curriculum_questions: [
                    {
                        question: `How would you start a conversation in this ${scenario.toLowerCase()} situation?`,
                        expected_response: `Begin with a polite greeting appropriate for ${target_language} culture.`
                    },
                    {
                        question: `What key vocabulary should you focus on for this scenario?`,
                        expected_response: `Practice common phrases and words related to ${scenario.toLowerCase()}.`
                    },
                    {
                        question: `How would you ask for help or clarification if you don't understand?`,
                        expected_response: `Use polite phrases to request repetition or explanation.`
                    }
                ],
                correction_examples: [
                    {
                        incorrect_phrase: "Hello, I want...",
                        correct_phrase: "Hello, I would like...",
                        explanation: "Use more polite forms when making requests in formal situations."
                    }
                ]
            }

            return NextResponse.json(fallbackCurriculum)
        }

    } catch (error) {
        console.error('Error in curriculum API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
} 