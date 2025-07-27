"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react"

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

interface VoiceWidgetProps {
    character: Character
    onBack: () => void
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

declare global {
    interface Window {
        vapiSDK: any
    }
}

export default function VoiceWidget({ character, onBack }: VoiceWidgetProps) {
    const [isCallActive, setIsCallActive] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const vapiInstanceRef = useRef<any>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Vapi configuration - use character ID as assistant ID
    const assistant = character.id
    const apiKey = "34d415aa-e3e3-4f23-aaa4-45c0ab668188"

    const getInitialGreeting = (character: Character) => {
        const greetings: { [key: string]: string } = {
            "Marie Dubois": "Bonjour ! Bienvenue à mon café. Que puis-je vous servir ce matin ? Un café, un croissant ?",
            "Carlos Rodriguez": "¡Hola! Qué bueno verte por aquí. ¿Quieres un poco de tortilla? El partido está emocionante, ¿verdad?",
            "Hiroshi Tanaka": "こんにちは！田中と申します。お疲れさまです。新しいインターンの方ですね。何か困ったことはありませんか？",
            "Emma Thompson": "Good afternoon! Welcome to my tea party. Do make yourself comfortable. Have you had a chance to try the Earl Grey?",
            "Hans Mueller": "Guten Tag! Schön, dass Sie nach meiner Präsentation vorbeischauen. Haben Sie Fragen zur Softwareentwicklung in Deutschland?",
            "Li Wei": "你好！欢迎来到我的茶馆。请坐。今天想品尝哪种茶呢？",
        }
        return greetings[character.name] || `Hello! I'm ${character.name}. Let's practice ${character.language} together!`
    }

    useEffect(() => {
        // Load Vapi SDK
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
                    console.log('Call started')
                    setIsCallActive(true)
                    setIsLoading(false)

                    // Add initial greeting
                    const greeting = getInitialGreeting(character)
                    setMessages([{
                        id: '1',
                        role: 'assistant',
                        content: greeting,
                        timestamp: new Date()
                    }])
                })

                vapiInstanceRef.current.on('call-end', () => {
                    console.log('Call ended')
                    setIsCallActive(false)
                    setIsLoading(false)
                })

                vapiInstanceRef.current.on('message', (message: any) => {
                    if (message.type === 'transcript') {
                        const newMessage: Message = {
                            id: Date.now().toString(),
                            role: message.role as "user" | "assistant",
                            content: message.transcript,
                            timestamp: new Date()
                        }
                        setMessages(prev => [...prev, newMessage])
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

        return () => {
            if (vapiInstanceRef.current) {
                vapiInstanceRef.current.stop()
            }
        }
    }, [character])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const startCall = async () => {
        if (!vapiInstanceRef.current) return

        setIsLoading(true)
        try {
            await vapiInstanceRef.current.start()
        } catch (error) {
            console.error('Failed to start call:', error)
            setIsLoading(false)
        }
    }

    const endCall = () => {
        if (vapiInstanceRef.current) {
            vapiInstanceRef.current.stop()
        }
    }

    const toggleMute = () => {
        if (vapiInstanceRef.current) {
            if (isMuted) {
                vapiInstanceRef.current.unmute()
            } else {
                vapiInstanceRef.current.mute()
            }
            setIsMuted(!isMuted)
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 p-4 bg-gray-800 border-b border-gray-700">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="text-gray-400 hover:text-gray-200"
                    >
                        ← Back to Characters
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                    {/* Voice Chat Interface */}
                    <div className="lg:col-span-2">
                        <Card className="h-[600px] flex flex-col bg-gray-800 border-gray-700">
                            <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
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

                                {/* Messages */}
                                <div className="space-y-4">
                                    {messages.map((message) => (
                                        <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                            }`}>
                                            {message.role === 'assistant' && (
                                                <img
                                                    src={character.avatar || "/placeholder.svg"}
                                                    alt={character.name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            )}
                                            <div className={`max-w-md ${message.role === 'user' ? 'order-first' : ''
                                                }`}>
                                                <div className={`rounded-lg p-3 ${message.role === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-white'
                                                    }`}>
                                                    <p>{message.content}</p>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {message.timestamp.toLocaleTimeString()}
                                                </p>
                                            </div>
                                            {message.role === 'user' && (
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                    You
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
                                        The button will appear in the bottom-right corner
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Character Info Sidebar */}
                    <div className="space-y-6">
                        <Card className="bg-gray-800 border-gray-700">
                            <CardContent className="p-4">
                                <div className="text-center mb-4">
                                    <img
                                        src={character.avatar || "/placeholder.svg"}
                                        alt={character.name}
                                        className="w-20 h-20 rounded-full mx-auto mb-3"
                                    />
                                    <h3 className="font-semibold text-white">{character.name}</h3>
                                    <Badge className="mt-1 bg-blue-600 text-white">{character.language}</Badge>
                                </div>
                                <p className="text-sm text-gray-300 mb-3">{character.situation}</p>
                                <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                                    <span>🎙️ Voice Assistant</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-white mb-3">Voice Chat with {character.name}</h3>
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li>• Speak naturally in {character.language}</li>
                                    <li>• Mix in English when you're stuck</li>
                                    <li>• Get real-time voice responses</li>
                                    <li>• Practice pronunciation and fluency</li>
                                    <li>• Ask about culture and daily life</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-white mb-3">Voice Controls</h3>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-green-400" />
                                        <span>Start/End call</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mic className="w-4 h-4 text-blue-400" />
                                        <span>Mute/Unmute</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
} 