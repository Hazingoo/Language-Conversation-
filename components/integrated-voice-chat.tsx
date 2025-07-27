"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, MessageCircle, Volume2, Lightbulb } from "lucide-react"


interface Character {
    id: string
    name: string
    avatar: string
    situation: string
    language: string
    personality: string
    interactions: string
    creator?: string
    systemPrompt: string
}

interface VoiceMessage {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
    isVoiceMessage: boolean
    corrections?: Array<{
        original: string
        corrected: string
        explanation: string
        type: "correction" | "alternative"
    }>
    encouragement?: string
}

interface FeedbackMessage {
    id: string
    type: "correction" | "suggestion" | "encouragement"
    content: string
    originalText?: string
    correctedText?: string
    explanation?: string
    corrections?: Array<{
        original: string
        corrected: string
        explanation: string
        type: "correction" | "alternative"
    }>
    encouragement?: string
    timestamp: Date
}

interface IntegratedVoiceChatProps {
    character: Character
    onBack: () => void
}

declare global {
    interface Window {
        vapiSDK: any
    }
}

export default function IntegratedVoiceChat({ character, onBack }: IntegratedVoiceChatProps) {
    const [isCallActive, setIsCallActive] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([])
    const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([])
    const [conversationContext, setConversationContext] = useState<string>("")
    const [curriculum, setCurriculum] = useState<any>(null)
    const [learningObjectives, setLearningObjectives] = useState<string[]>([])
    const vapiInstanceRef = useRef<any>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Vapi configuration - use character ID as assistant ID
    const assistant = character.id
    const apiKey = "34d415aa-e3e3-4f23-aaa4-45c0ab668188"

    // OpenAI messages state for debugging
    const [openaiMessages, setOpenaiMessages] = useState<any[]>([])

    const parseAssistantMessage = (content: string) => {
        const corrections: Array<{
            original: string
            corrected: string
            explanation: string
            type: "correction" | "alternative"
        }> = []
        const encouragementMatch = content.match(/\[ENCOURAGEMENT\](.*?)\[\/ENCOURAGEMENT\]/)
        const encouragement = encouragementMatch ? encouragementMatch[1].trim() : undefined

        const correctionRegex = /\[CORRECTION\](.*?)\|(.*?)\|(.*?)\[\/CORRECTION\]/g
        let correctionMatch
        while ((correctionMatch = correctionRegex.exec(content)) !== null) {
            corrections.push({
                original: correctionMatch[1],
                corrected: correctionMatch[2],
                explanation: correctionMatch[3],
                type: "correction",
            })
        }

        const alternativeRegex = /\[ALTERNATIVE\](.*?)\|(.*?)\|(.*?)\[\/ALTERNATIVE\]/g
        let alternativeMatch
        while ((alternativeMatch = alternativeRegex.exec(content)) !== null) {
            corrections.push({
                original: alternativeMatch[1],
                corrected: alternativeMatch[2],
                explanation: alternativeMatch[3],
                type: "alternative",
            })
        }

        const cleanContent = content
            .replace(/\[CORRECTION\].*?\[\/CORRECTION\]/g, "")
            .replace(/\[ALTERNATIVE\].*?\[\/ALTERNATIVE\]/g, "")
            .replace(/\[ENCOURAGEMENT\].*?\[\/ENCOURAGEMENT\]/g, "")
            .trim()

        return { cleanContent, corrections, encouragement }
    }

    // Fetch curriculum and learning objectives
    const fetchCurriculum = async () => {
        try {
            const response = await fetch('/api/curriculum', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target_language: character.language,
                    scenario: character.situation
                })
            })

            if (response.ok) {
                const curriculumData = await response.json()
                setCurriculum(curriculumData)

                // Extract learning objectives from curriculum questions
                const objectives = curriculumData.curriculum_questions?.map((q: any) => q.question) || []
                setLearningObjectives(objectives)
                console.log('Loaded curriculum:', curriculumData)
                console.log('Learning objectives:', objectives)
            } else {
                console.log('Failed to fetch curriculum, using character context only')
            }
        } catch (error) {
            console.error('Error fetching curriculum:', error)
        }
    }

    const getInitialGreeting = (character: Character) => {
        const greetings = {
            French: "Bonjour ! Bienvenue à mon café. Que puis-je vous servir ce matin ?",
            Spanish: "¡Hola! Bienvenido a mi taxi. ¿A dónde vamos hoy?",
            Japanese: "いらっしゃいませ！コンビニへようこそ。何かお探しですか？",
            English: "Hello! Welcome to our conversation. How can I help you practice today?"
        }
        return greetings[character.language as keyof typeof greetings] || greetings.English
    }

    useEffect(() => {
        const loadVapiSDK = () => {
            if (typeof window !== 'undefined' && !window.vapiSDK) {
                const script = document.createElement('script')
                script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"
                script.defer = true
                script.async = true

                script.onload = () => {
                    if (window.vapiSDK) {
                        initializeVapi()
                    }
                }
                document.head.appendChild(script)
            } else if (window.vapiSDK) {
                initializeVapi()
            }
        }

        const initializeVapi = () => {
            try {
                const buttonConfig = {
                    buttonPosition: "bottom-right",
                    buttonSize: 60,
                    buttonColor: "#12A594",
                    waveformColor: "#FF4444",
                    tooltip: `Speak with ${character.name}!`,
                }

                vapiInstanceRef.current = window.vapiSDK.run({
                    apiKey: apiKey,
                    assistant: assistant,
                    config: buttonConfig
                })

                // Set up event listeners
                vapiInstanceRef.current.on('call-start', () => {
                    console.log('Vapi call started')
                    setIsCallActive(true)
                    setIsLoading(false)

                    // Add initial greeting
                    const greeting = getInitialGreeting(character)
                    const initialMessage: VoiceMessage = {
                        id: '1',
                        role: 'assistant',
                        content: greeting,
                        timestamp: new Date(),
                        isVoiceMessage: true
                    }
                    setVoiceMessages([initialMessage])
                    setConversationContext(greeting)
                })

                vapiInstanceRef.current.on('call-end', () => {
                    console.log('Vapi call ended')
                    setIsCallActive(false)
                    setIsLoading(false)

                    // Generate final feedback when call ends
                    if (voiceMessages.length > 1) {
                        generateConversationFeedback()
                    }
                })

                vapiInstanceRef.current.on('message', (message: any) => {
                    console.log('Vapi message received:', message)

                    if (message.type === 'transcript') {
                        console.log('Transcript message:', message.role, ':', message.transcript)

                        const newMessage: VoiceMessage = {
                            id: Date.now().toString(),
                            role: message.role as "user" | "assistant",
                            content: message.transcript,
                            timestamp: new Date(),
                            isVoiceMessage: true
                        }
                        setVoiceMessages(prev => [...prev, newMessage])

                        // Update conversation context
                        setConversationContext(prev => prev + "\n" + `${message.role}: ${message.transcript}`)

                        // Generate real-time feedback for ALL user messages (no filtering)
                        if (message.role === 'user') {
                            console.log('🗣️ User spoke:', message.transcript)
                            console.log('🔄 Triggering feedback generation...')
                            // Add a small delay to ensure the message is added to state first
                            setTimeout(() => {
                                generateRealTimeFeedback(message.transcript, newMessage.id)
                            }, 100)
                        }

                        // ALSO generate feedback when assistant responds (like regular chat)
                        if (message.role === 'assistant') {
                            console.log('🤖 Assistant responded:', message.transcript)
                            console.log('🔄 Generating feedback for conversation...')
                            // Add a small delay to ensure the message is added to state first
                            setTimeout(() => {
                                generateConversationBasedFeedback()
                            }, 500)
                        }
                    }
                })

                vapiInstanceRef.current.on('error', (error: any) => {
                    console.error('Vapi error:', error)
                    setIsLoading(false)
                })
            } catch (error) {
                console.error('Failed to initialize Vapi:', error)
            }
        }

        loadVapiSDK()
        fetchCurriculum()

        return () => {
            if (vapiInstanceRef.current) {
                vapiInstanceRef.current.stop()
            }
        }
    }, [character])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [voiceMessages, feedbackMessages])

    const generateRealTimeFeedback = async (userMessage: string, messageId?: string) => {
        try {
            console.log('🎯 Generating feedback for:', userMessage)

            // Create enhanced prompt with learning objectives and curriculum context
            let feedbackPrompt = `IMPORTANT: You MUST provide feedback for every user message, no matter how simple.

User just said: "${userMessage}" in ${character.language}.`

            // Add curriculum context if available
            if (curriculum && curriculum.correction_examples) {
                const correctionExamples = curriculum.correction_examples.map((ex: any) =>
                    `"${ex.incorrect_phrase}" → "${ex.correct_phrase}" (${ex.explanation})`
                ).join('\n')

                feedbackPrompt += `\n\nCommon corrections to watch for:\n${correctionExamples}`
            }

            // Add learning objectives
            if (learningObjectives.length > 0) {
                feedbackPrompt += `\n\nFocus on these learning objectives:\n${learningObjectives.join('\n')}`
            }

            feedbackPrompt += `\n\nProvide specific, actionable feedback using the following structured format:

1. If there are grammar or vocabulary corrections needed, use:
   [CORRECTION]original phrase|corrected phrase|explanation in English[/CORRECTION]

2. If the user's phrase is correct but you want to suggest alternatives, use:
   [ALTERNATIVE]original phrase|alternative phrase|explanation in English[/ALTERNATIVE]

3. Always include encouragement using:
   [ENCOURAGEMENT]encouraging message[/ENCOURAGEMENT]

IMPORTANT: 
- ALWAYS provide feedback, even for single words like "hello" or "yes"
- Use the exact format above with pipes (|) to separate parts
- Provide clear explanations in English
- Be encouraging and supportive
- You can include multiple corrections/alternatives if needed

Example:
[CORRECTION]Je suis mange|Je mange|In English: Use "je mange" (I eat) not "je suis mange" (I am eaten). The verb "manger" doesn't need "suis" here.[/CORRECTION]
[ENCOURAGEMENT]Great effort with French pronunciation! Keep practicing![/ENCOURAGEMENT]`

            console.log('📝 Sending feedback request with prompt:', feedbackPrompt.substring(0, 200) + '...')

            // Use direct fetch instead of useChat for more control
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "user",
                            content: feedbackPrompt
                        }
                    ],
                    targetLanguage: character.language,
                    nativeLanguage: "English",
                    characterPrompt: character.systemPrompt,
                    curriculumContext: curriculum,
                    stream: false
                })
            })

            console.log('📡 Feedback API response status:', response.status)

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Feedback response received:', data)

                if (data.content && data.content.trim()) {
                    // Parse the structured feedback
                    const { cleanContent, corrections, encouragement } = parseAssistantMessage(data.content)

                    console.log('💬 Parsed feedback - corrections:', corrections, 'encouragement:', encouragement)

                    // If we have a messageId, attach feedback directly to the user message
                    if (messageId && (corrections && corrections.length > 0 || encouragement)) {
                        setVoiceMessages(prev => {
                            const newMessages = [...prev]
                            const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
                            if (messageIndex !== -1) {
                                newMessages[messageIndex] = {
                                    ...newMessages[messageIndex],
                                    corrections: corrections,
                                    encouragement: encouragement
                                }
                                console.log('✅ Feedback attached to user message:', newMessages[messageIndex])
                            }
                            return newMessages
                        })
                    } else {
                        // Fallback to the old feedback system if no messageId or no structured feedback
                        const feedback: FeedbackMessage = {
                            id: Date.now().toString(),
                            type: "suggestion",
                            content: cleanContent || data.content,
                            corrections: corrections,
                            encouragement: encouragement,
                            timestamp: new Date()
                        }

                        console.log('💬 Adding fallback feedback to UI:', feedback)

                        setFeedbackMessages(prev => {
                            const newMessages = [...prev, feedback]
                            return newMessages.slice(-5)
                        })
                    }
                } else {
                    console.warn('⚠️ Empty feedback response received')
                    // Create a simple encouragement directly attached to the message
                    if (messageId) {
                        setVoiceMessages(prev => {
                            const newMessages = [...prev]
                            const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
                            if (messageIndex !== -1) {
                                newMessages[messageIndex] = {
                                    ...newMessages[messageIndex],
                                    encouragement: `Good job practicing ${character.language}! Keep going with your conversation.`
                                }
                            }
                            return newMessages
                        })
                    }
                }
            } else {
                console.error('❌ Failed to get feedback response:', response.status, response.statusText)
                // Add error feedback directly to message if possible
                if (messageId) {
                    setVoiceMessages(prev => {
                        const newMessages = [...prev]
                        const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
                        if (messageIndex !== -1) {
                            newMessages[messageIndex] = {
                                ...newMessages[messageIndex],
                                encouragement: "I'm having trouble generating feedback right now, but keep practicing! You're doing great."
                            }
                        }
                        return newMessages
                    })
                }
            }
        } catch (error) {
            console.error('💥 Error generating real-time feedback:', error)
            // Add error feedback directly to message if possible
            if (messageId) {
                setVoiceMessages(prev => {
                    const newMessages = [...prev]
                    const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
                    if (messageIndex !== -1) {
                        newMessages[messageIndex] = {
                            ...newMessages[messageIndex],
                            encouragement: "Keep up the great work! I'm having technical difficulties with feedback right now."
                        }
                    }
                    return newMessages
                })
            }
        }
    }

    const generateConversationBasedFeedback = async () => {
        try {
            // Get the most recent user message that needs feedback
            const userMessages = voiceMessages.filter(msg => msg.role === 'user')
            const lastUserMessage = userMessages[userMessages.length - 1]

            if (!lastUserMessage || lastUserMessage.corrections || lastUserMessage.encouragement) {
                return // Already has feedback or no user message to process
            }

            console.log('🎯 Generating conversation-based feedback for:', lastUserMessage.content)

            // Create a context-aware prompt using the recent conversation
            const recentMessages = voiceMessages.slice(-4) // Last 4 messages for context
            const conversationContext = recentMessages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n')

            let feedbackPrompt = `Based on this conversation in ${character.language}, provide feedback for the user's most recent message:

${conversationContext}

FOCUS on the user's last message: "${lastUserMessage.content}"

User just said: "${lastUserMessage.content}" in ${character.language}.`

            // Add curriculum context if available
            if (curriculum && curriculum.correction_examples) {
                const correctionExamples = curriculum.correction_examples.map((ex: any) =>
                    `"${ex.incorrect_phrase}" → "${ex.correct_phrase}" (${ex.explanation})`
                ).join('\n')
                feedbackPrompt += `\n\nCommon corrections to watch for:\n${correctionExamples}`
            }

            // Add learning objectives
            if (learningObjectives.length > 0) {
                feedbackPrompt += `\n\nFocus on these learning objectives:\n${learningObjectives.join('\n')}`
            }

            feedbackPrompt += `\n\nProvide specific, actionable feedback using the following structured format:

1. If there are grammar or vocabulary corrections needed, use:
   [CORRECTION]original phrase|corrected phrase|explanation in English[/CORRECTION]

2. If the user's phrase is correct but you want to suggest alternatives, use:
   [ALTERNATIVE]original phrase|alternative phrase|explanation in English[/ALTERNATIVE]

3. Always include encouragement using:
   [ENCOURAGEMENT]encouraging message[/ENCOURAGEMENT]

IMPORTANT: 
- ALWAYS provide feedback, even for single words like "hello" or "yes"
- Use the exact format above with pipes (|) to separate parts
- Provide clear explanations in English
- Be encouraging and supportive
- Analyze the conversation context for more accurate feedback

Example:
[CORRECTION]Je suis mange|Je mange|In English: Use "je mange" (I eat) not "je suis mange" (I am eaten). The verb "manger" doesn't need "suis" here.[/CORRECTION]
[ENCOURAGEMENT]Great effort with French pronunciation! Keep practicing![/ENCOURAGEMENT]`

            // Use direct fetch for feedback
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: "user", content: feedbackPrompt }],
                    targetLanguage: character.language,
                    nativeLanguage: "English",
                    characterPrompt: character.systemPrompt,
                    curriculumContext: curriculum,
                    stream: false
                })
            })

            if (response.ok) {
                const data = await response.json()
                console.log('✅ Conversation-based feedback received:', data)

                if (data.content && data.content.trim()) {
                    // Parse the structured feedback
                    const { cleanContent, corrections, encouragement } = parseAssistantMessage(data.content)

                    console.log('💬 Parsed conversation feedback - corrections:', corrections, 'encouragement:', encouragement)

                    // Attach feedback to the last user message
                    setVoiceMessages(prev => {
                        const newMessages = [...prev]
                        const messageIndex = newMessages.findIndex(msg => msg.id === lastUserMessage.id)
                        if (messageIndex !== -1) {
                            newMessages[messageIndex] = {
                                ...newMessages[messageIndex],
                                corrections: corrections,
                                encouragement: encouragement
                            }
                            console.log('✅ Conversation feedback attached to user message:', newMessages[messageIndex])
                        }
                        return newMessages
                    })
                } else {
                    // Add encouragement if no structured feedback
                    setVoiceMessages(prev => {
                        const newMessages = [...prev]
                        const messageIndex = newMessages.findIndex(msg => msg.id === lastUserMessage.id)
                        if (messageIndex !== -1) {
                            newMessages[messageIndex] = {
                                ...newMessages[messageIndex],
                                encouragement: `Good job practicing ${character.language}! Keep going with your conversation.`
                            }
                        }
                        return newMessages
                    })
                }
            }
        } catch (error) {
            console.error('💥 Error generating conversation-based feedback:', error)
        }
    }

    const generateConversationFeedback = async () => {
        try {
            const conversationSummary = voiceMessages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n')

            // Create comprehensive feedback prompt with learning objectives
            let feedbackPrompt = `Conversation ended. Here's the full conversation:\n${conversationSummary}\n\n`

            if (learningObjectives.length > 0) {
                feedbackPrompt += `Learning objectives that were focused on:\n${learningObjectives.join('\n')}\n\n`
            }

            if (curriculum && curriculum.correction_examples) {
                const corrections = curriculum.correction_examples.map((ex: any) =>
                    `${ex.incorrect_phrase} → ${ex.correct_phrase}`
                ).join('\n')
                feedbackPrompt += `Key corrections to remember:\n${corrections}\n\n`
            }

            feedbackPrompt += `Provide a comprehensive summary using structured feedback format:

1. Use [CORRECTION]original|corrected|explanation[/CORRECTION] for any specific errors found in the conversation
2. Use [ALTERNATIVE]phrase|alternative|explanation[/ALTERNATIVE] for suggesting better ways to express ideas
3. Always include [ENCOURAGEMENT]positive message about progress and next steps[/ENCOURAGEMENT]

Cover these areas:
- Overall performance assessment
- Grammar and vocabulary achievements  
- Cultural learning points
- Areas for improvement
- Specific examples from the conversation

Be detailed, constructive, and encouraging. Use the structured format to highlight specific moments from the conversation.`

            // Use direct fetch for conversation feedback
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "user",
                            content: feedbackPrompt
                        }
                    ],
                    targetLanguage: character.language,
                    nativeLanguage: "English",
                    characterPrompt: character.systemPrompt,
                    curriculumContext: curriculum,
                    stream: false
                })
            })

            if (response.ok) {
                const data = await response.json()
                if (data.content) {
                    // Parse the structured conversation feedback
                    const { cleanContent, corrections, encouragement } = parseAssistantMessage(data.content)

                    const feedback: FeedbackMessage = {
                        id: Date.now().toString(),
                        type: "suggestion",
                        content: cleanContent || data.content,
                        corrections: corrections,
                        encouragement: encouragement,
                        timestamp: new Date()
                    }

                    setFeedbackMessages(prev => {
                        const newMessages = [...prev, feedback]
                        return newMessages.slice(-5)
                    })
                }
            }
        } catch (error) {
            console.error('Error generating conversation feedback:', error)
        }
    }

    const addFeedbackMessage = (feedback: FeedbackMessage) => {
        setFeedbackMessages(prev => {
            // Keep only the last 5 feedback messages to avoid clutter
            const recentMessages = prev.slice(-4)
            return [...recentMessages, feedback]
        })
    }

    // Removed old useEffect since we're using direct fetch now

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={onBack}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to Characters
                    </Button>
                    <div className="flex items-center gap-3">
                        <img
                            src={character.avatar || "/placeholder.svg"}
                            alt={character.name}
                            className="w-10 h-10 rounded-full"
                        />
                        <div>
                            <h2 className="font-semibold text-white">{character.name}</h2>
                            <p className="text-sm text-gray-400">
                                {character.language} • {character.personality}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Voice Conversation - Full Width */}
                <div className="max-w-4xl mx-auto">
                    <Card className="h-[700px] flex flex-col bg-gray-800 border-gray-700">
                        <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
                            {/* Learning Objectives at the top */}
                            {learningObjectives.length > 0 && (
                                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                                    <h4 className="text-lg font-semibold text-blue-300 mb-2">🎯 Learning Focus</h4>
                                    <div className="space-y-2">
                                        {learningObjectives.slice(0, 3).map((objective, idx) => (
                                            <div key={idx} className="text-sm text-blue-200">
                                                <span className="font-medium">Focus {idx + 1}:</span> {objective}
                                            </div>
                                        ))}
                                    </div>
                                    {curriculum && curriculum.correction_examples && curriculum.correction_examples.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-blue-600">
                                            <p className="text-xs text-blue-300 font-medium mb-1">Key Correction:</p>
                                            <p className="text-xs text-blue-200">
                                                "{curriculum.correction_examples[0].incorrect_phrase}" →
                                                "{curriculum.correction_examples[0].correct_phrase}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Situation Display */}
                            <div className="bg-gray-700 rounded-lg p-4 mb-4 text-center">
                                <h4 className="text-lg font-semibold text-white mb-2">Current Situation:</h4>
                                <p className="text-gray-300 italic">"{character.situation}"</p>
                            </div>

                            {/* Voice Call Status */}
                            <div className={`rounded-lg p-4 mb-4 text-center ${isCallActive
                                ? 'bg-green-900/30 border border-green-700'
                                : 'bg-gray-700 border border-gray-600'
                                }`}>
                                <h4 className="text-lg font-semibold mb-2">
                                    {isCallActive ? '🎙️ Voice Call Active' : '🎤 Ready for Voice Chat'}
                                </h4>
                                <p className="text-sm text-gray-300">
                                    {isCallActive
                                        ? 'Speak naturally with your AI language partner'
                                        : 'Look for the floating microphone button in the bottom-right corner'
                                    }
                                </p>
                            </div>

                            {/* Voice Messages with Integrated Feedback */}
                            <div className="space-y-4">
                                {voiceMessages.map((message) => (
                                    <div key={message.id} className="space-y-3">
                                        {/* Main Message */}
                                        <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                            }`}>
                                            {message.role === 'assistant' && (
                                                <img
                                                    src={character.avatar || "/placeholder.svg"}
                                                    alt={character.name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            )}
                                            <div className={`max-w-md ${message.role === 'user' ? 'order-first' : ''}`}>
                                                <div className={`rounded-lg p-3 ${message.role === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-white'
                                                    }`}>
                                                    <p>{message.content}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-xs text-gray-500">
                                                        {message.timestamp.toLocaleTimeString()}
                                                    </p>
                                                    {message.isVoiceMessage && (
                                                        <Volume2 className="w-3 h-3 text-blue-400" />
                                                    )}
                                                </div>
                                            </div>
                                            {message.role === 'user' && (
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                    You
                                                </div>
                                            )}
                                        </div>

                                        {/* Integrated Feedback for User Messages */}
                                        {message.role === 'user' && (message.corrections || message.encouragement) && (
                                            <div className="flex justify-end">
                                                <div className="max-w-md space-y-2">
                                                    {/* Structured corrections/alternatives attached to message */}
                                                    {message.corrections && message.corrections.length > 0 && (
                                                        <div className="space-y-2">
                                                            {message.corrections.map((correction, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`border rounded-lg p-3 ${correction.type === "correction"
                                                                        ? "bg-red-900/30 border-red-700"
                                                                        : "bg-blue-900/30 border-blue-700"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className={
                                                                                correction.type === "correction"
                                                                                    ? "bg-red-700 text-red-100"
                                                                                    : "bg-blue-700 text-blue-100"
                                                                            }
                                                                        >
                                                                            {correction.type === "correction" ? "Correction" : "Alternative"}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-sm text-gray-300 mb-2">{correction.explanation}</p>
                                                                    <p className="text-sm">
                                                                        <span
                                                                            className={
                                                                                correction.type === "correction"
                                                                                    ? "line-through text-red-400"
                                                                                    : "text-gray-400"
                                                                            }
                                                                        >
                                                                            "{correction.original}"
                                                                        </span>
                                                                        {" → "}
                                                                        <span
                                                                            className={
                                                                                correction.type === "correction"
                                                                                    ? "text-green-400 font-medium"
                                                                                    : "text-blue-400 font-medium"
                                                                            }
                                                                        >
                                                                            "{correction.corrected}"
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Encouragement attached to message */}
                                                    {message.encouragement && (
                                                        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge variant="default" className="text-xs bg-green-600">Encouragement</Badge>
                                                            </div>
                                                            <p className="text-sm text-green-200">{message.encouragement}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Loading State */}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <img
                                        src={character.avatar || "/placeholder.svg"}
                                        alt={character.name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div className="bg-gray-700 rounded-lg p-3">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>

                        {/* Voice Instructions */}
                        <div className="p-4 border-t border-gray-700">
                            <div className="text-center">
                                <p className="text-sm text-gray-300 mb-2">
                                    🎙️ Use the floating microphone button to start voice chat
                                </p>
                                <p className="text-xs text-gray-400">
                                    Real-time feedback will appear directly in the conversation!
                                </p>

                                {/* Debug buttons */}
                                <div className="mt-3 space-x-2">
                                    <Button
                                        onClick={() => generateRealTimeFeedback("こんにちは")}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        Test Feedback
                                    </Button>
                                    <Button
                                        onClick={() => generateConversationBasedFeedback()}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        Test Conversation
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
} 