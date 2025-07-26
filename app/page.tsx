"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Send, Volume2 } from "lucide-react"
import { useChat } from "ai/react"
import type { SpeechRecognition } from "web-speech-api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  corrections?: Array<{
    original: string
    corrected: string
    explanation: string
  }>
  encouragement?: string
}

function UserMessageWithCorrections({
  content,
  corrections,
}: {
  content: string
  corrections: Array<{
    original: string
    corrected: string
    explanation: string
  }>
}) {
  if (!corrections || corrections.length === 0) {
    return <p className="text-gray-800">{content}</p>
  }

  let highlightedContent = content

  // Highlight each correction in the text
  corrections.forEach((correction, index) => {
    const regex = new RegExp(`\\b${correction.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi")
    highlightedContent = highlightedContent.replace(
      regex,
      `<mark class="bg-red-200 text-red-800 px-1 rounded cursor-pointer" data-correction="${index}">${correction.original}</mark>`,
    )
  })

  return <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: highlightedContent }} />
}

export default function LanguageLearningApp() {
  const [isListening, setIsListening] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState("French")
  const [nativeLanguage, setNativeLanguage] = useState("English")
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const getLanguageCode = (language: string) => {
    const languageCodes: { [key: string]: string } = {
      French: "fr-FR",
      Spanish: "es-ES",
      German: "de-DE",
      Italian: "it-IT",
      Chinese: "zh-CN", // Mandarin Chinese
      Japanese: "ja-JP",
      Korean: "ko-KR",
    }
    return languageCodes[language] || "en-US"
  }

  const getInitialGreeting = (language: string) => {
    const greetings: { [key: string]: string } = {
      French:
        "Bonjour ! Je suis votre assistant pour apprendre le français. N'hésitez pas à mélanger l'anglais et le français - c'est tout à fait normal quand on apprend ! Comment allez-vous aujourd'hui ?",
      Spanish:
        "¡Hola! Soy tu asistente para aprender español. No dudes en mezclar inglés y español - ¡es completamente normal cuando estás aprendiendo! ¿Cómo estás hoy?",
      German:
        "Hallo! Ich bin dein Assistent zum Deutschlernen. Zögere nicht, Englisch und Deutsch zu mischen - das ist völlig normal beim Lernen! Wie geht es dir heute?",
      Italian:
        "Ciao! Sono il tuo assistente per imparare l'italiano. Non esitare a mescolare inglese e italiano - è completamente normale quando stai imparando! Come stai oggi?",
      Chinese: "你好！我是你的中文学习助手。随时可以混合使用英语和中文 - 这在学习时是完全正常的！你今天怎么样？",
      Japanese:
        "こんにちは！私はあなたの日本語学習アシスタントです。英語と日本語を混ぜて使っても大丈夫です - 学習中はとても自然なことです！今日はいかがですか？",
      Korean:
        "안녕하세요! 저는 한국어 학습 도우미입니다. 영어와 한국어를 섞어서 사용해도 괜찮습니다 - 학습할 때는 완전히 자연스러운 일입니다! 오늘 어떠세요?",
    }
    return (
      greetings[language] ||
      `Hello! I'm your ${language} learning assistant. Feel free to mix languages - it's normal when learning! How are you today?`
    )
  }

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        content: getInitialGreeting(targetLanguage),
      },
    ],
    body: {
      targetLanguage,
      nativeLanguage,
    },
    onFinish: (message) => {
      // Process the assistant's response to extract corrections for the previous user message
      if (message.role === "assistant") {
        const { corrections } = parseAssistantMessage(message.content)

        if (corrections && corrections.length > 0) {
          // Find the last user message and add corrections to it
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

  // Effect to re-initialize chat messages and speech recognition when targetLanguage changes
  useEffect(() => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: getInitialGreeting(targetLanguage),
      },
    ])
    if (recognitionRef.current) {
      recognitionRef.current.lang = getLanguageCode(targetLanguage)
    }
  }, [targetLanguage, setMessages])

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = getLanguageCode(targetLanguage) // Set initial language

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
      } else {
        console.warn("Speech Recognition API not supported in this browser.")
      }
    }
  }, [targetLanguage]) // Re-run when targetLanguage changes to update recognition.lang

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
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = getLanguageCode(targetLanguage)
      utterance.rate = 0.8
      synthRef.current.speak(utterance)
    }
  }

  const handleVoiceSubmit = () => {
    if (transcript) {
      const syntheticEvent = {
        preventDefault: () => {},
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
    const corrections: Array<{ original: string; corrected: string; explanation: string }> = []
    const encouragementMatch = content.match(/\[ENCOURAGEMENT\](.*?)\[\/ENCOURAGEMENT\]/s)
    const encouragement = encouragementMatch ? encouragementMatch[1].trim() : undefined

    const correctionMatches = content.matchAll(/\[CORRECTION\](.*?)\|(.*?)\|(.*?)\[\/CORRECTION\]/g)
    for (const match of correctionMatches) {
      corrections.push({
        original: match[1],
        corrected: match[2],
        explanation: match[3],
      })
    }

    const cleanContent = content
      .replace(/\[CORRECTION\].*?\[\/CORRECTION\]/g, "")
      .replace(/\[ENCOURAGEMENT\].*?\[\/ENCOURAGEMENT\]/g, "")
      .trim()

    return { cleanContent, corrections, encouragement }
  }

  const getLanguageTips = (language: string) => {
    const tips: { [key: string]: string[] } = {
      French: [
        "Don't worry about perfect grammar",
        "Use gestures and context clues",
        'Ask "Comment dit-on...?" when stuck',
        "Practice a little every day",
      ],
      Spanish: [
        "Don't worry about perfect grammar",
        "Use gestures and context clues",
        'Ask "¿Cómo se dice...?" when stuck',
        "Practice a little every day",
      ],
      German: [
        "Don't worry about perfect grammar",
        "Use gestures and context clues",
        'Ask "Wie sagt man...?" when stuck',
        "Practice a little every day",
      ],
      Italian: [
        "Don't worry about perfect grammar",
        "Use gestures and context clues",
        'Ask "Come si dice...?" when stuck',
        "Practice a little every day",
      ],
      Chinese: [
        "Focus on tones - they change meaning",
        "Don't worry about writing characters initially",
        'Ask "这个用中文怎么说？" (Zhège yòng Zhōngwén zěnme shuō?) when stuck',
        "Practice listening to native speakers daily",
      ],
      Japanese: [
        "Learn hiragana and katakana first",
        "Don't worry about kanji initially",
        'Ask "これは日本語で何と言いますか？" (Kore wa Nihongo de nan to iimasu ka?) when stuck',
        "Practice politeness levels gradually",
      ],
      Korean: [
        "Master Hangul - it's easier than it looks",
        "Don't worry about honorifics initially",
        'Ask "이것을 한국어로 뭐라고 해요?" (Igeoseul Hangugeoro mworago haeyo?) when stuck',
        "Practice pronunciation with native audio",
      ],
    }
    return tips[language] || tips["French"]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Speak from Day One</h1>
          <p className="text-lg text-gray-600">Practice {targetLanguage} with AI - mix languages freely!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <div key={message.id} className="flex gap-3 justify-end">
                        <div className="flex-1 flex flex-col items-end space-y-2">
                          <div className="bg-gray-100 rounded-lg p-3 max-w-md relative">
                            <UserMessageWithCorrections
                              content={message.content}
                              corrections={message.corrections || []}
                            />
                          </div>

                          {/* Show corrections for user messages */}
                          {message.corrections && message.corrections.length > 0 && (
                            <div className="space-y-2 max-w-md">
                              {message.corrections.map((correction, idx) => (
                                <div key={idx} className="bg-green-100 border border-green-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="bg-green-200 text-green-800">
                                      Suggestion
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    <span className="line-through text-red-600">"{correction.original}"</span>
                                    {" → "}
                                    <span className="text-green-700 font-medium">"{correction.corrected}"</span>
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">{correction.explanation}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-medium">
                          You
                        </div>
                      </div>
                    )
                  } else {
                    const { cleanContent, corrections, encouragement } = parseAssistantMessage(message.content)
                    return (
                      <div key={message.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-medium">
                          AI
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="bg-teal-100 rounded-lg p-3 max-w-md">
                            <p className="text-gray-800">{cleanContent}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => speakText(cleanContent)}
                              className="mt-2 h-6 px-2"
                            >
                              <Volume2 className="w-3 h-3" />
                            </Button>
                          </div>

                          {corrections.length > 0 && (
                            <div className="space-y-2">
                              {corrections.map((correction, idx) => (
                                <div key={idx} className="bg-green-100 border border-green-200 rounded-lg p-3 max-w-md">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="bg-green-200 text-green-800">
                                      Correction
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    <span className="line-through text-red-600">{correction.original}</span>
                                    {" → "}
                                    <span className="text-green-700 font-medium">{correction.corrected}</span>
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">{correction.explanation}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {encouragement && (
                            <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 max-w-md">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                                  Encouragement
                                </Badge>
                              </div>
                              <p className="text-sm text-blue-700">{encouragement}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                })}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-medium">
                      AI
                    </div>
                    <div className="bg-teal-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="p-4 border-t">
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div className="relative">
                    <div className="relative">
                      <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder={`Type in ${targetLanguage} or ${nativeLanguage}...`}
                        className="flex-1 pr-20"
                      />
                      {isAnalyzing && (
                        <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isListening ? "destructive" : "outline"}
                      size="icon"
                      onClick={isListening ? stopListening : startListening}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </form>

                {isListening && (
                  <p className="text-sm text-teal-600 mt-2 text-center">
                    🎤 Listening... Speak in {targetLanguage} or {nativeLanguage}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Tips and Settings */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-800 mb-3">How it works</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Speak or type in {targetLanguage}</li>
                  <li>• Mix in {nativeLanguage} when you're stuck</li>
                  <li>• Get gentle corrections and encouragement</li>
                  <li>• Practice without fear of judgment</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Tips for Success</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {getLanguageTips(targetLanguage).map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Language Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Target Language</label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                      <option value="Italian">Italian</option>
                      <option value="Chinese">Chinese (Mandarin)</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Korean">Korean</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Native Language</label>
                    <select
                      value={nativeLanguage}
                      onChange={(e) => setNativeLanguage(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-md"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                      <option value="Mandarin">Mandarin</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Korean">Korean</option>
                    </select>
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
