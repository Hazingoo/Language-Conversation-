"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, MessageCircle, Users, ChevronLeft, Mic, MicOff, Send, Volume2, Phone } from "lucide-react"
import { useChat } from "ai/react"
import VoiceWidget from "@/components/voice-widget"
import IntegratedVoiceChat from "@/components/integrated-voice-chat"
// Web Speech API types
declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
    }
}

interface Character {
    id: string
    name: string
    avatar: string
    situation: string // Changed from description to situation
    language: string
    personality: string
    interactions: string
    creator?: string
    systemPrompt: string
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    corrections?: Array<{
        original: string
        corrected: string
        explanation: string
        type: "correction" | "alternative"
    }>
    encouragement?: string
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

interface Curriculum {
    scenario_scene: string
    curriculum_questions: CurriculumQuestion[]
    correction_examples: CorrectionExample[]
}

const defaultCharacters: Character[] = [
    {
        id: "0b506d44-27e1-47e3-ae99-b86292d65c4a",
        name: "Yuki",
        avatar: "/images/yuki.png",
        situation:
            "You are at a convenience store in Tokyo late at night, buying snacks before heading home. Yuki is the friendly clerk who loves anime and is very patient with beginners learning Japanese.",
        language: "Japanese",
        personality: "Anime-loving convenience store clerk",
        interactions: "1.2k",
        systemPrompt:
            "You are Yuki, a friendly convenience store clerk in Tokyo who loves anime and is very patient with beginners. The user is buying snacks during late-night runs to your store. You're knowledgeable about Japanese convenience store culture, popular anime, and everyday Japanese phrases. You speak primarily in Japanese but are happy to explain things in English. You're enthusiastic about Japanese pop culture and always encourage language learners. You often make references to anime and manga while teaching practical Japanese for daily situations like shopping.",
    },
    {
        id: "86e77163-0ea3-4a0d-b54a-d9fdd4603e40",
        name: "Marie",
        avatar: "/images/marie.png",
        situation:
            "You are at Marie's cozy Parisian café, ordering coffee for your weekend brunch. Marie is a warm foodie who encourages mistakes and loves sharing French culinary culture.",
        language: "French",
        personality: "Warm foodie café owner",
        interactions: "2.8k",
        systemPrompt:
            "You are Marie, a warm and welcoming café owner in Paris who is passionate about food and French culture. The user is at your cozy café ordering coffee and pastries for weekend brunch. You love discussing French cuisine, wine, cooking techniques, and French café culture. You speak primarily in French but explain culinary terms and cultural nuances in English when needed. You're very encouraging with language learners and believe that making mistakes is part of learning. You often share recipes, food stories, and French dining etiquette while teaching conversational French.",
    },
    {
        id: "fb243c9b-d631-4d44-a0bd-f933a84336f0",
        name: "Carlos",
        avatar: "/images/carlos.png",
        situation:
            "You are in Carlos's taxi in Mexico City, asking for directions and making small talk about the weather. Carlos is a chatty family man who loves sharing local stories and Mexican culture.",
        language: "Spanish",
        personality: "Chatty family man taxi driver",
        interactions: "3.5k",
        systemPrompt:
            "You are Carlos, a chatty and friendly taxi driver in Mexico City who loves his family and enjoys sharing local stories. The user is your passenger, and you're helping them with directions while discussing the weather and local life. You're passionate about Mexican culture, family values, local food, and Mexico City's history. You speak primarily in Spanish but help with English explanations when needed. You're warm, hospitable, and love telling stories about your family, Mexican traditions, and interesting places around the city. You often teach Mexican slang and cultural expressions while sharing your local knowledge.",
    },
]

function UserMessageWithCorrections({
    content,
    corrections,
}: {
    content: string
    corrections: Array<{
        original: string
        corrected: string
        explanation: string
        type: "correction" | "alternative"
    }>
}) {
    if (!corrections || corrections.length === 0) {
        return <p className="text-white">{content}</p>
    }

    let highlightedContent = content

    corrections.forEach((correction, index) => {
        const regex = new RegExp(`\\b${correction.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
        const colorClass = correction.type === "correction" ? "bg-red-700 text-red-100" : "bg-blue-700 text-blue-100"
        highlightedContent = highlightedContent.replace(
            regex,
            `<mark class="${colorClass} px-1 rounded cursor-pointer" data-correction="${index}">${correction.original}</mark>`,
        )
    })

    return <p className="text-white" dangerouslySetInnerHTML={{ __html: highlightedContent }} />
}

export default function LanguageLearningApp() {
    const [characters, setCharacters] = useState<Character[]>(defaultCharacters)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [curriculum, setCurriculum] = useState<Curriculum | null>(null)
    const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(false)
    const [isVoiceMode, setIsVoiceMode] = useState(false)
    const [isIntegratedVoiceMode, setIsIntegratedVoiceMode] = useState(false)
    const [newCharacter, setNewCharacter] = useState({
        name: "",
        situation: "", // Changed from description to situation
        language: "",
        personality: "",
    })

    // Chat-related state
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState("")
    const recognitionRef = useRef<any>(null)
    const synthRef = useRef<SpeechSynthesis | null>(null)

    const getLanguageCode = (language: string) => {
        const languageCodes: { [key: string]: string } = {
            French: "fr-FR",
            Spanish: "es-ES",
            German: "de-DE",
            Italian: "it-IT",
            Chinese: "zh-CN",
            Japanese: "ja-JP",
            Korean: "ko-KR",
            English: "en-GB",
        }
        return languageCodes[language] || "en-US"
    }

    const getInitialGreeting = (character: Character) => {
        // For custom characters, generate natural greeting based on language and personality
        if (character.creator === "You") {
            const languageGreetings: { [key: string]: string } = {
                French: `Bonjour ! Je suis ${character.name}. Bienvenue dans cette situation : "${character.situation}". Comment allez-vous aujourd'hui ?`,
                Spanish: `¡Hola! Soy ${character.name}. Bienvenido a esta situación: "${character.situation}". ¿Cómo estás hoy?`,
                German: `Guten Tag! Ich bin ${character.name}. Willkommen in dieser Situation: "${character.situation}". Wie geht es Ihnen heute?`,
                Italian: `Ciao! Sono ${character.name}. Benvenuto in questa situazione: "${character.situation}". Come stai oggi?`,
                Japanese: `こんにちは！${character.name}です。この状況へようこそ：「${character.situation}」。今日はいかがですか？`,
                Korean: `안녕하세요! 저는 ${character.name}입니다. 이 상황에 오신 것을 환영합니다: "${character.situation}". 오늘 어떠세요?`,
                Chinese: `你好！我是${character.name}。欢迎来到这个情境：“${character.situation}”。你今天怎么样？`,
                English: `Hello! I'm ${character.name}. Welcome to this situation: "${character.situation}". How are you today?`,
            }
            return (
                languageGreetings[character.language] ||
                `Hello! I'm ${character.name}. Let's practice ${character.language} together!`
            )
        }

        // For default characters, use natural greetings that reflect their personality and situation
        const greetings: { [key: string]: string } = {
            "Marie Dubois": "Bonjour ! Bienvenue à mon café. Que puis-je vous servir ce matin ? Un café, un croissant ?",
            "Carlos Rodriguez":
                "¡Hola! Qué bueno verte por aquí. ¿Quieres un poco de tortilla? El partido está emocionante, ¿verdad?",
            "Hiroshi Tanaka":
                "こんにちは！田中と申します。お疲れさまです。新しいインターンの方ですね。何か困ったことはありませんか？",
            "Emma Thompson":
                "Good afternoon! Welcome to my tea party. Do make yourself comfortable. Have you had a chance to try the Earl Grey?",
            "Hans Mueller":
                "Guten Tag! Schön, dass Sie nach meiner Präsentation vorbeischauen. Haben Sie Fragen zur Softwareentwicklung in Deutschland?",
            "Li Wei": "你好！欢迎来到我的茶馆。请坐。今天想品尝哪种茶呢？",
        }
        return greetings[character.name] || `Hello! I'm ${character.name}. Let's practice ${character.language} together!`
    }

    // Function to generate curriculum
    const generateCurriculum = async (character: Character) => {
        setIsLoadingCurriculum(true)
        try {
            const response = await fetch('/api/curriculum', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target_language: character.language,
                    scenario: character.situation.split('.')[0], // Extract scenario from situation
                }),
            })

            if (response.ok) {
                const curriculumData = await response.json()
                setCurriculum(curriculumData)
            } else {
                console.error('Failed to generate curriculum')
                setCurriculum(null)
            }
        } catch (error) {
            console.error('Error generating curriculum:', error)
            setCurriculum(null)
        } finally {
            setIsLoadingCurriculum(false)
        }
    }

    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
        api: "/api/chat",
        initialMessages: selectedCharacter
            ? [
                {
                    id: "1",
                    role: "assistant",
                    content: getInitialGreeting(selectedCharacter),
                },
            ]
            : [],
        body: {
            targetLanguage: selectedCharacter?.language || "French",
            nativeLanguage: "English",
            characterPrompt: selectedCharacter?.systemPrompt || "",
            curriculumContext: curriculum,
        },
        onFinish: (message) => {
            if (message.role === "assistant") {
                const { corrections } = parseAssistantMessage(message.content)

                if (corrections && corrections.length > 0) {
                    setMessages((prevMessages) => {
                        const newMessages = [...prevMessages]
                        for (let i = newMessages.length - 2; i >= 0; i--) {
                            if (newMessages[i].role === "user") {
                                newMessages[i] = {
                                    ...newMessages[i],
                                    corrections: corrections,
                                }
                                break
                            }
                        }
                        return newMessages
                    })
                }
            }
        },
    })

    const filteredCharacters = characters.filter(
        (character) =>
            character.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            character.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
            character.situation.toLowerCase().includes(searchQuery.toLowerCase()), // Changed to situation
    )

    const handleCreateCharacter = () => {
        if (newCharacter.name && newCharacter.situation && newCharacter.language && newCharacter.personality) {
            const languageInstructions: { [key: string]: string } = {
                French: "You respond primarily in French with English explanations when needed for corrections.",
                Spanish: "You respond primarily in Spanish with English explanations when needed for corrections.",
                German: "You respond primarily in German with English explanations when needed for corrections.",
                Italian: "You respond primarily in Italian with English explanations when needed for corrections.",
                Japanese:
                    "You respond primarily in Japanese with English explanations when needed for corrections. Include furigana for difficult kanji when helpful.",
                Korean:
                    "You respond primarily in Korean with English explanations when needed for corrections. Use appropriate levels of politeness.",
                Chinese:
                    "You respond primarily in simplified Chinese with English explanations when needed for corrections. Include pinyin for pronunciation help when useful.",
                English: "You respond in English and help learners improve their English skills.",
            }

            const character: Character = {
                id: Date.now().toString(),
                name: newCharacter.name,
                avatar: `/placeholder.svg?height=80&width=80&text=${newCharacter.name.charAt(0)}`,
                situation: newCharacter.situation, // Changed from description to situation
                language: newCharacter.language,
                personality: newCharacter.personality,
                interactions: "0",
                creator: "You",
                systemPrompt: `You are ${newCharacter.name}. You are ${newCharacter.personality}. The user is in the following situation: "${newCharacter.situation}". ${languageInstructions[newCharacter.language] || `You help people learn ${newCharacter.language}.`} 

IMPORTANT: Never explicitly state your role, personality, or the situation. Instead, naturally embody these characteristics and the situation through your behavior, questions, and conversation style. Ask questions and engage in topics that reflect your background, interests, and the current situation. Be encouraging, patient, and always stay in character while helping with language learning.

For example:
- If the situation is a café, ask about their order or the weather outside.
- If you're a chef, ask about favorite foods and cooking.
- If you're from a specific city, mention local places and culture naturally.
- If you have hobbies, bring them up in conversation organically.

Your personality and the situation should come through in HOW you speak and WHAT you choose to discuss, not by telling the user what you are or what the situation is.`,
            }
            setCharacters([character, ...characters])
            setNewCharacter({ name: "", situation: "", language: "", personality: "" }) // Changed to situation
            setShowCreateDialog(false)
        }
    }

    const handleCharacterSelect = (character: Character) => {
        setSelectedCharacter(character)
        setCurriculum(null) // Reset previous curriculum
        generateCurriculum(character) // Generate new curriculum
        setMessages([
            {
                id: "1",
                role: "assistant",
                content: getInitialGreeting(character),
            },
        ])
    }

    // Speech recognition setup
    useEffect(() => {
        if (typeof window !== "undefined") {
            synthRef.current = window.speechSynthesis

            if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = false
                recognitionRef.current.interimResults = false
                recognitionRef.current.lang = selectedCharacter ? getLanguageCode(selectedCharacter.language) : "en-US"

                recognitionRef.current.onresult = (event) => {
                    const transcript = event.results[0][0].transcript
                    setTranscript(transcript)
                    setIsListening(false)
                }

                recognitionRef.current.onerror = (event) => {
                    console.error("Speech recognition error:", event.error)
                    setIsListening(false)
                }

                recognitionRef.current.onend = () => {
                    setIsListening(false)
                }
            }
        }
    }, [selectedCharacter])

    const startListening = () => {
        if (recognitionRef.current) {
            setIsListening(true)
            recognitionRef.current.start()
        }
    }

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            setIsListening(false)
        }
    }

    const speakText = (text: string) => {
        if (synthRef.current && selectedCharacter) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = getLanguageCode(selectedCharacter.language)
            utterance.rate = 0.8
            synthRef.current.speak(utterance)
        }
    }

    const handleVoiceSubmit = () => {
        if (transcript) {
            const syntheticEvent = {
                preventDefault: () => { },
                target: { message: { value: transcript } },
            } as any
            handleSubmit(syntheticEvent)
            setTranscript("")
        }
    }

    useEffect(() => {
        if (transcript) {
            handleVoiceSubmit()
        }
    }, [transcript])

    const parseAssistantMessage = (content: string) => {
        const corrections: Array<{
            original: string
            corrected: string
            explanation: string
            type: "correction" | "alternative"
        }> = []
        const encouragementMatch = content.match(/\[ENCOURAGEMENT\](.*?)\[\/ENCOURAGEMENT\]/s)
        const encouragement = encouragementMatch ? encouragementMatch[1].trim() : undefined

        const correctionMatches = content.matchAll(/\[CORRECTION\](.*?)\|(.*?)\|(.*?)\[\/CORRECTION\]/g)
        for (const match of correctionMatches) {
            corrections.push({
                original: match[1],
                corrected: match[2],
                explanation: match[3],
                type: "correction",
            })
        }

        const alternativeMatches = content.matchAll(/\[ALTERNATIVE\](.*?)\|(.*?)\|(.*?)\[\/ALTERNATIVE\]/g)
        for (const match of alternativeMatches) {
            corrections.push({
                original: match[1],
                corrected: match[2],
                explanation: match[3],
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

    // Chat Interface Component
    if (selectedCharacter) {
        // If integrated voice mode is enabled, show the integrated voice chat
        if (isIntegratedVoiceMode) {
            return (
                <IntegratedVoiceChat
                    character={selectedCharacter}
                    onBack={() => {
                        setIsIntegratedVoiceMode(false)
                        setSelectedCharacter(null)
                    }}
                />
            )
        }

        // If voice mode is enabled, show the voice widget
        if (isVoiceMode) {
            return (
                <VoiceWidget
                    character={selectedCharacter}
                    onBack={() => {
                        setIsVoiceMode(false)
                        setSelectedCharacter(null)
                    }}
                />
            )
        }

        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <div className="max-w-6xl mx-auto">
                    {/* Chat Header */}
                    <div className="flex items-center gap-4 p-4 bg-gray-800 border-b border-gray-700">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCharacter(null)}
                            className="text-gray-400 hover:text-gray-200"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to Characters
                        </Button>
                        <div className="flex items-center gap-3">
                            <img
                                src={selectedCharacter.avatar || "/placeholder.svg"}
                                alt={selectedCharacter.name}
                                className="w-10 h-10 rounded-full"
                            />
                            <div>
                                <h2 className="font-semibold text-white">{selectedCharacter.name}</h2>
                                <p className="text-sm text-gray-400">
                                    {selectedCharacter.language} • {selectedCharacter.personality}
                                </p>
                            </div>
                        </div>
                        <div className="ml-auto flex gap-2">
                            <Button
                                onClick={() => setIsIntegratedVoiceMode(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                AI Voice + Feedback
                            </Button>
                            <Button
                                onClick={() => setIsVoiceMode(true)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                Voice Chat
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                        {/* Chat Interface */}
                        <div className="lg:col-span-2">
                            <Card className="h-[600px] flex flex-col bg-gray-800 border-gray-700">
                                <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
                                    {/* Situation Display */}
                                    <div className="bg-gray-700 rounded-lg p-4 mb-4 text-center">
                                        <h4 className="text-lg font-semibold text-white mb-2">Current Situation:</h4>
                                        <p className="text-gray-300 italic">"{selectedCharacter.situation}"</p>
                                    </div>

                                    {/* Curriculum Display */}
                                    {isLoadingCurriculum && (
                                        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                                            <h4 className="text-lg font-semibold text-blue-300 mb-2">🎯 Generating Learning Objectives...</h4>
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                                            </div>
                                        </div>
                                    )}

                                    {curriculum && !isLoadingCurriculum && (
                                        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                                            <h4 className="text-lg font-semibold text-blue-300 mb-2">🎯 Learning Objectives</h4>
                                            <div className="space-y-2">
                                                {curriculum.curriculum_questions.slice(0, 3).map((question, idx) => (
                                                    <div key={idx} className="text-sm text-blue-200">
                                                        <span className="font-medium">Focus {idx + 1}:</span> {question.question}
                                                    </div>
                                                ))}
                                            </div>
                                            {curriculum.correction_examples.length > 0 && (
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

                                    {messages.map((message) => {
                                        if (message.role === "user") {
                                            return (
                                                <div key={message.id} className="flex gap-3 justify-end">
                                                    <div className="flex-1 flex flex-col items-end space-y-2">
                                                        <div className="bg-gray-700 rounded-lg p-3 max-w-md relative">
                                                            <UserMessageWithCorrections
                                                                content={message.content}
                                                                corrections={message.corrections || []}
                                                            />
                                                        </div>

                                                        {message.corrections && message.corrections.length > 0 && (
                                                            <div className="space-y-2 max-w-md">
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
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-medium">
                                                        You
                                                    </div>
                                                </div>
                                            )
                                        } else {
                                            const { cleanContent } = parseAssistantMessage(message.content)
                                            return (
                                                <div key={message.id} className="flex gap-3">
                                                    <img
                                                        src={selectedCharacter.avatar || "/placeholder.svg"}
                                                        alt={selectedCharacter.name}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="bg-gray-700 rounded-lg p-3 max-w-md">
                                                            <p className="text-white">{cleanContent}</p>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => speakText(cleanContent)}
                                                                className="mt-2 h-6 px-2 text-gray-400 hover:text-white"
                                                            >
                                                                <Volume2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    })}
                                    {isLoading && (
                                        <div className="flex gap-3">
                                            <img
                                                src={selectedCharacter.avatar || "/placeholder.svg"}
                                                alt={selectedCharacter.name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <div className="bg-gray-700 rounded-lg p-3">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                                    <div
                                                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                                        style={{ animationDelay: "0.1s" }}
                                                    ></div>
                                                    <div
                                                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                                        style={{ animationDelay: "0.2s" }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>

                                <div className="p-4 border-t border-gray-700">
                                    <form onSubmit={handleSubmit} className="space-y-2">
                                        <div className="relative">
                                            <Input
                                                value={input}
                                                onChange={handleInputChange}
                                                placeholder={`Type in ${selectedCharacter.language} or English...`}
                                                className="flex-1 pr-20 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant={isListening ? "destructive" : "outline"}
                                                size="icon"
                                                onClick={isListening ? stopListening : startListening}
                                                className="border-gray-600 text-gray-300 hover:text-white"
                                            >
                                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                            </Button>
                                            <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                                <Send className="w-4 h-4 mr-2" />
                                                Send Message
                                            </Button>
                                        </div>
                                    </form>

                                    {isListening && (
                                        <p className="text-sm text-blue-400 mt-2 text-center">
                                            🎤 Listening... Speak in {selectedCharacter.language} or English
                                        </p>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Character Info Sidebar */}
                        <div className="space-y-6">
                            <Card className="bg-gray-800 border-gray-700">
                                <CardContent className="p-4">
                                    <div className="text-center mb-4">
                                        <img
                                            src={selectedCharacter.avatar || "/placeholder.svg"}
                                            alt={selectedCharacter.name}
                                            className="w-20 h-20 rounded-full mx-auto mb-3"
                                        />
                                        <h3 className="font-semibold text-white">{selectedCharacter.name}</h3>
                                        <Badge className="mt-1 bg-blue-600 text-white">{selectedCharacter.language}</Badge>
                                    </div>
                                    <p className="text-sm text-gray-300 mb-3">{selectedCharacter.situation}</p> {/* Display situation */}
                                    <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                                        <MessageCircle className="w-3 h-3" />
                                        {selectedCharacter.interactions} conversations
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-800 border-gray-700">
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-white mb-3">How to chat with {selectedCharacter.name}</h3>
                                    <ul className="space-y-2 text-sm text-gray-300">
                                        <li>• Speak or type in {selectedCharacter.language}</li>
                                        <li>• Mix in English when you're stuck</li>
                                        <li>• Get gentle corrections and encouragement</li>
                                        <li>• Ask about culture and daily life</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Character Selection Interface (existing code remains the same)
    return (
        <div className="min-h-screen bg-gray-900 text-white flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-4">
                    <h1 className="text-xl font-bold mb-6">language.ai</h1>

                    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                            <Button className="w-full mb-6 bg-gray-700 hover:bg-gray-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Create
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-800 border-gray-700 text-white">
                            <DialogHeader>
                                <DialogTitle>Create Language Learning Character</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Character Name</Label>
                                    <Input
                                        id="name"
                                        value={newCharacter.name}
                                        onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                                        placeholder="e.g., Sofia Martinez"
                                        className="bg-gray-700 border-gray-600"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="language">Language</Label>
                                    <Select
                                        value={newCharacter.language}
                                        onValueChange={(value) => setNewCharacter({ ...newCharacter, language: value })}
                                    >
                                        <SelectTrigger className="bg-gray-700 border-gray-600">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-700 border-gray-600">
                                            <SelectItem value="French">French</SelectItem>
                                            <SelectItem value="Spanish">Spanish</SelectItem>
                                            <SelectItem value="German">German</SelectItem>
                                            <SelectItem value="Italian">Italian</SelectItem>
                                            <SelectItem value="Japanese">Japanese</SelectItem>
                                            <SelectItem value="Korean">Korean</SelectItem>
                                            <SelectItem value="Chinese">Chinese</SelectItem>
                                            <SelectItem value="English">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="personality">Personality/Role</Label>
                                    <Input
                                        id="personality"
                                        value={newCharacter.personality}
                                        onChange={(e) => setNewCharacter({ ...newCharacter, personality: e.target.value })}
                                        placeholder="e.g., Friendly teacher from Barcelona"
                                        className="bg-gray-700 border-gray-600"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="situation">Situation Description</Label> {/* Changed label */}
                                    <Textarea
                                        id="situation" // Changed ID
                                        value={newCharacter.situation}
                                        onChange={(e) => setNewCharacter({ ...newCharacter, situation: e.target.value })} // Changed to situation
                                        placeholder="Describe the scenario the user is in when chatting with this character (e.g., 'You are at a bustling market in Mexico City, trying to buy fresh produce.')"
                                        className="bg-gray-700 border-gray-600"
                                        rows={3}
                                    />
                                </div>
                                <Button onClick={handleCreateCharacter} className="w-full">
                                    Create Character
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <div className="space-y-2">
                        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
                            <Users className="w-4 h-4 mr-3" />
                            Discover
                        </Button>
                    </div>
                </div>

                <div className="p-4 mt-auto border-t border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            H
                        </div>
                        <span className="text-sm">Hazingo</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-semibold mb-1">Welcome back,</h2>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                    H
                                </div>
                                <span className="text-xl">Hazingo</span>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 w-64"
                            />
                        </div>
                    </div>

                    {/* Hero Section */}
                    <div className="relative mb-8 rounded-lg overflow-hidden">
                        <div
                            className="h-64 bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center"
                            style={{
                                backgroundImage: "url('/placeholder.svg?height=256&width=800&text=Language+Learning+Hero')",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                            }}
                        >
                            <div className="text-center">
                                <p className="text-lg mb-2 opacity-90">What do you want to do?</p>
                                <h3 className="text-3xl font-bold">Practice with AI Language Partners</h3>
                            </div>
                        </div>
                    </div>

                    {/* Featured Characters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {filteredCharacters.slice(0, 2).map((character) => (
                            <Card
                                key={character.id}
                                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                                onClick={() => handleCharacterSelect(character)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <img
                                            src={character.avatar || "/placeholder.svg"}
                                            alt={character.name}
                                            className="w-16 h-16 rounded-full"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-white">{character.name}</h3>
                                                <Badge variant="secondary" className="bg-blue-600 text-white">
                                                    {character.language}
                                                </Badge>
                                            </div>
                                            <p className="text-gray-300 text-sm mb-4 line-clamp-3">{character.situation}</p>{" "}
                                            {/* Display situation */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-400">{character.creator && `By ${character.creator}`}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-gray-600 text-gray-300 hover:text-gray-200 bg-transparent"
                                                >
                                                    Chat
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* For You Section */}
                    <div>
                        <h3 className="text-xl font-semibold mb-6">For you</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredCharacters.slice(2).map((character) => (
                                <Card
                                    key={character.id}
                                    className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                                    onClick={() => handleCharacterSelect(character)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <img
                                                src={character.avatar || "/placeholder.svg"}
                                                alt={character.name}
                                                className="w-12 h-12 rounded-lg"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-medium text-white truncate">{character.name}</h4>
                                                    <Badge variant="secondary" className="bg-blue-600 text-white text-xs">
                                                        {character.language}
                                                    </Badge>
                                                </div>
                                                {character.creator && <p className="text-xs text-gray-400 mb-2">By {character.creator}</p>}
                                                <p className="text-sm text-gray-300 line-clamp-2 mb-3">{character.situation}</p>{" "}
                                                {/* Display situation */}
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <MessageCircle className="w-3 h-3" />
                                                    {character.interactions}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
