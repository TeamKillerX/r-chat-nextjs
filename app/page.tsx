"use client"

/*
# -*- coding: utf-8 -*-
# Copyright 2019-2025 (c) Randy W @xtdevs, @xtsea
#
# from : https://github.com/TeamKillerX
# Channel : @RendyProjects
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Send,
  Copy,
  Check,
  Square,
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Navigation2,
  Play,
  BrushCleaning
} from 'lucide-react'

import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useDebounceCallback } from '@react-hook/debounce'
import 'highlight.js/styles/github-dark.css'

import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import { SYSTEM_PROMPT } from '@/components/systemprompt'
import '@/styles/ryzenthcode.css'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  liked?: boolean
}

function childrenToText(children: React.ReactNode): string {
  if (Array.isArray(children)) return children.map(childrenToText).join('')
  if (typeof children === 'string') return children
  if (typeof children === 'number') return children.toString()
  if (children && typeof children === 'object' && 'props' in children)
    return childrenToText((children as any).props.children)
  return ''
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const RyzenthChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system',
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [lastStoppedMessage, setLastStoppedMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fetchControllerRef = useRef<AbortController | null>(null)

  const clearMessages = useCallback(() => {
    setMessages([{
      id: 'system',
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: new Date(),
    }])
    setLastStoppedMessage(null)
  }, [])

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current
      setShowScrollTop(scrollTop > 300)
    }
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  const scrollToTop = useCallback(() => {
    messagesContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  const scrollToBottom = useCallback((instant: boolean = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    if (isStreaming || streamingMessage) {
      scrollToBottom();
    }
  }, [streamingMessage, isStreaming, scrollToBottom]);

  useEffect(() => {
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    if (nonSystemMessages.length > 0 && !isStreaming) {
      const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
      if (lastMessage.role === 'assistant' && !streamingMessage) {
        scrollToBottom(true);
      }
    }
  }, [messages, isStreaming, streamingMessage, scrollToBottom]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [])

  const debouncedAdjustTextareaHeight = useCallback(debounce(adjustTextareaHeight, 100), [adjustTextareaHeight])

  useEffect(() => {
    debouncedAdjustTextareaHeight()
  }, [input, debouncedAdjustTextareaHeight])

  useEffect(() => {
    return () => {
      fetchControllerRef.current?.abort()
      fetchControllerRef.current = null
    }
  }, [])

  const copyToClipboard = useCallback(async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }, [])

  const toggleLike = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, liked: !msg.liked } : msg
    ))
  }, [])

  const regenerateResponse = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return
    
    const newMessages = messages.slice(0, messageIndex)
    setMessages(newMessages)
    
    const lastUserMessage = newMessages.filter(m => m.role === 'user').pop()
    if (lastUserMessage) {
      setInput(lastUserMessage.content)
      setTimeout(() => handleSubmit(), 100)
    }
  }, [messages])

  const stopStreaming = useCallback(() => {
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort()
      fetchControllerRef.current = null
      setIsStreaming(false)
      setIsLoading(false)
      
      if (streamingMessage.trim()) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: streamingMessage,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
        setLastStoppedMessage(streamingMessage)
      }
      setStreamingMessage('')
    }
  }, [streamingMessage])

  const continueStreaming = useCallback(async () => {
    if (!lastStoppedMessage) return

    setIsLoading(true)
    setIsStreaming(true)
    setStreamingMessage(lastStoppedMessage)

    const userMessages = messages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]
    
    if (!lastUserMessage) return

    const systemMsg = messages.find(m => m.role === 'system')
    const normalMsgs = messages.filter(m => m.role !== 'system')
    const payloadMessages = [
      systemMsg,
      ...normalMsgs.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: lastUserMessage.content },
    ]

    const controller = new AbortController()
    fetchControllerRef.current = controller

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct',
          messages: payloadMessages,
          stream: true,
        }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      if (!response.body) throw new Error('No response body stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = lastStoppedMessage
      let eventBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        eventBuffer += decoder.decode(value, { stream: true })
        const parts = eventBuffer.split('\n\n')
        eventBuffer = parts.pop() || ''

        for (const part of parts) {
          const lines = part.split('\n').map(l => l.trim()).filter(Boolean)
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const data = line.replace(/^data:\s*/, '')
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              const contentPiece =
                (typeof delta === 'string' ? delta : delta?.content) ??
                parsed.choices?.[0]?.text ?? ''

              if (contentPiece) {
                fullContent += contentPiece
                setStreamingMessage(fullContent)
              }
            } catch {}
          }
        }
      }

      if (eventBuffer.trim()) {
        const leftoverLines = eventBuffer.split('\n').map(l => l.trim()).filter(Boolean)
        for (const line of leftoverLines) {
          if (!line.startsWith('data:')) continue
          const data = line.replace(/^data:\s*/, '')
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            const contentPiece =
              (typeof delta === 'string' ? delta : delta?.content) ??
              parsed.choices?.[0]?.text ?? ''
            if (contentPiece) {
              fullContent += contentPiece
              setStreamingMessage(fullContent)
            }
          } catch {}
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingMessage('')
      setLastStoppedMessage(null)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Error: ${error.message || error.toString()}`,
            timestamp: new Date(),
          },
        ])
      }
      setStreamingMessage('')
      setLastStoppedMessage(null)
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      fetchControllerRef.current = null
    }
  }, [messages, lastStoppedMessage])

  const handleSubmit = useCallback(async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading) return

    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort()
      fetchControllerRef.current = null
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsStreaming(true)
    setStreamingMessage('')
    setLastStoppedMessage(null)

    const systemMsg = messages.find(m => m.role === 'system')
    const normalMsgs = messages.filter(m => m.role !== 'system')
    const payloadMessages = [
      systemMsg ? { role: systemMsg.role, content: systemMsg.content } : null,
      ...normalMsgs.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage.content },
    ].filter(Boolean) as any[]

    const controller = new AbortController()
    fetchControllerRef.current = controller

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct',
          messages: payloadMessages,
          stream: true,
        }),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      if (!response.body) throw new Error('No response body stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let eventBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        eventBuffer += decoder.decode(value, { stream: true })
        const parts = eventBuffer.split('\n\n')
        eventBuffer = parts.pop() || ''

        for (const part of parts) {
          const lines = part.split('\n').map(l => l.trim()).filter(Boolean)
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const data = line.replace(/^data:\s*/, '')
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              const contentPiece =
                (typeof delta === 'string' ? delta : delta?.content) ??
                parsed.choices?.[0]?.text ?? ''

              if (contentPiece) {
                fullContent += contentPiece
                setStreamingMessage(fullContent)
              }
            } catch {}
          }
        }
      }

      if (eventBuffer.trim()) {
        const leftoverLines = eventBuffer.split('\n').map(l => l.trim()).filter(Boolean)
        for (const line of leftoverLines) {
          if (!line.startsWith('data:')) continue
          const data = line.replace(/^data:\s*/, '')
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            const contentPiece =
              (typeof delta === 'string' ? delta : delta?.content) ??
              parsed.choices?.[0]?.text ?? ''
            if (contentPiece) {
              fullContent += contentPiece
              setStreamingMessage(fullContent)
            }
          } catch {}
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingMessage('')
      setLastStoppedMessage(null)
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `Error: ${error.message || error.toString()}`,
            timestamp: new Date(),
          },
        ])
      }
      setStreamingMessage('')
      setLastStoppedMessage(null)
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      fetchControllerRef.current = null
    }
  }, [input, isLoading, messages])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit, isLoading])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex flex-col">
      {messages.filter(m => m.role !== 'system').length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 absolute inset-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative mb-4 flex justify-center"
            >
              <div className="relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent horror-font"
                  style={{ textShadow: '0 0 8px rgba(255, 0, 0, 0.5)' }}
                >
                  R
                </motion.div>
                <div className="snowfall-container">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, 80],
                        x: [0, Math.sin(i * 0.5) * 15],
                        opacity: [0.8, 0],
                        scale: [1, 0.5],
                      }}
                      transition={{
                        duration: 1.5 + Math.random() * 1,
                        repeat: Infinity,
                        delay: Math.random() * 0.8,
                        ease: "easeOut",
                      }}
                      className="snowflake"
                      style={{
                        background: ['#ff0000', '#800080', '#0000ff', '#ffffff'][Math.floor(Math.random() * 4)],
                        boxShadow: '0 0 3px rgba(255, 255, 255, 0.3)',
                        width: '4px',
                        height: '4px',
                      }}
                    />
                  ))}
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.3, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-black/20 blur-lg rounded-full"
                />
              </div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl md:text-3xl font-bold text-white mb-3 horror-font"
              style={{ textShadow: '0 0 6px rgba(255, 0, 0, 0.4)' }}
            >
              How can I help you today?
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-gray-400 text-sm md:text-base mb-6"
            >
              Ask me anything about coding, design, or general knowledge
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-wrap justify-center gap-2"
            >
              {["Create a React component", "Explain quantum computing", "Design tips for dark mode", "Python code example"].map((suggestion, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setInput(suggestion)
                    setTimeout(() => {
                      textareaRef.current?.focus()
                      textareaRef.current?.setSelectionRange(suggestion.length, suggestion.length)
                    }, 100)
                  }}
                  className="px-3 py-1.5 bg-gray-800/60 backdrop-blur-sm rounded text-gray-300 hover:text-white border border-gray-700 hover:border-red-500 transition-all duration-200 text-xs md:text-sm"
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      )}

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="w-full max-w-3xl mx-auto space-y-3">
          {messages.filter(m => m.role !== 'system').map((message, index) => (
            <React.Fragment key={message.id}>
              <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`inline-block max-w-[95%] rounded-lg relative group ${
                    message.role === 'user'
                      ? 'ml-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'mr-auto bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg text-white'
                  }`}
                >
                  <div className="px-3 py-2 prose prose-invert max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      linkTarget="_blank"
                      components={{
                        table: ({ children, ...props }) => (
                          <div className="table-container">
                            <table 
                              {...props} 
                              className="compact-table"
                              style={{ 
                                width: 'auto',
                                minWidth: '100%',
                                fontSize: '0.7rem',
                                lineHeight: '1.2'
                              }}
                            >
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children, ...props }) => (
                          <th 
                            {...props} 
                            style={{ 
                              padding: '0.25rem 0.5rem',
                              whiteSpace: 'nowrap',
                              fontWeight: '600'
                            }}
                          >
                            {children}
                          </th>
                        ),
                        td: ({ children, ...props }) => (
                          <td 
                            {...props} 
                            style={{ 
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.7rem'
                            }}
                          >
                            {children}
                          </td>
                        ),
                        code: ({ inline, className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '')
                          const codeContent = childrenToText(children)

                          return !inline && match ? (
                            <div className="relative code-block-container">
                              <div className="flex justify-between items-center mb-1 code-header">
                                <span className="text-xs text-gray-400/45 uppercase">{match[1]}</span>
                                <button
                                  onClick={() => copyToClipboard(codeContent, message.id + '-code')}
                                  className="flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-transparent hover:bg-white/5 transition-colors"
                                >
                                  {copiedMessageId === message.id + '-code' ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span className="text-xs">{copiedMessageId === message.id + '-code' ? 'Copied!' : 'Copy'}</span>
                                </button>
                              </div>
                              <pre className={className} style={{ 
                                padding: '0.35rem',
                                borderRadius: '0.25rem',
                                overflowX: 'auto',
                                overflowY: 'auto',
                                maxHeight: '200px',
                                margin: '0.1rem 0',
                                backgroundColor: '#0f172a',
                                color: '#f8fafc',
                                fontSize: '0.7rem',
                                lineHeight: '1.2'
                              }}>
                                <code className={className} {...props} style={{
                                  background: 'transparent',
                                  padding: 0
                                }}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          ) : (
                            <code className="bg-slate-800 text-yellow-400 px-1 py-[1px] rounded text-xs font-mono leading-tight"
                              {...props}
                            >
                              {children}
                            </code>
                          )
                        },
                        strong: ({ children, ...props }) => (
                          <strong className="font-bold text-purple-400" {...props}>
                            {children}
                          </strong>
                        ),
                        hr: () => (
                          <hr className="divider" />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                
                  <div className="flex items-center justify-between px-2 py-1 bg-transparent rounded-b-lg">
                    <div className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Copy message"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    
                      {message.role === 'assistant' && (
                        <>
                          <button
                            onClick={() => regenerateResponse(message.id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title="Regenerate response"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toggleLike(message.id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title={message.liked ? 'Unlike' : 'Like'}
                          >
                            {message.liked ? (
                              <ThumbsUp className="w-3 h-3 text-blue-400 fill-blue-400" />
                            ) : (
                              <ThumbsUp className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            title="Dislike"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {index < messages.filter(m => m.role !== 'system').length - 1 && (
                <hr className="divider" />
              )}
            </React.Fragment>
          ))}

          {isStreaming && !streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[95%] rounded-lg bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg text-white overflow-hidden relative px-4 py-2 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-purple-600 text-5xl md:text-6xl font-extrabold horror-font">
                    R
                  </span>
                  <span className="absolute w-12 h-12 rounded-full bg-gradient-to-r from-red-600 to-purple-600 blur-md opacity-40 animate-ping"></span>
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0.5 }}
                      animate={{ scaleY: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 h-3 bg-gradient-to-t from-red-600 to-purple-600 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {streamingMessage && (
            <div className="flex justify-start">
              <div className="relative p-[1px] max-w-[95%] rounded-lg bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 animate-gradient-x">
                <div className="relative bg-black/40 backdrop-blur-xl rounded-lg border border-white/10 shadow-lg text-white p-3 overflow-hidden">
                  <div className="scan-line"></div>
                  <div className="px-2 py-1 prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      linkTarget="_blank"
                      components={{
                        table: ({ children, ...props }) => (
                          <div className="table-container">
                            <table 
                              {...props} 
                              className="compact-table"
                              style={{ 
                                width: 'auto',
                                minWidth: '100%',
                                fontSize: '0.7rem',
                                lineHeight: '1.2'
                              }}
                            >
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children, ...props }) => (
                          <th 
                            {...props} 
                            style={{ 
                              padding: '0.25rem 0.5rem',
                              whiteSpace: 'nowrap',
                              fontWeight: '600'
                            }}
                          >
                            {children}
                          </th>
                        ),
                        td: ({ children, ...props }) => (
                          <td 
                            {...props} 
                            style={{ 
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.7rem'
                            }}
                          >
                            {children}
                          </td>
                        ),
                        code: ({ inline, className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '')
                          const codeContent = childrenToText(children)
                            
                          return !inline && match ? (
                            <div className="relative">
                              <div className="code-block-container">
                                <div className="flex justify-between items-center mb-0.5 code-header">
                                  <span className="text-xs text-gray-400/45 uppercase">
                                    {match[1]}
                                  </span>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(codeContent, 'streaming-code')
                                    }
                                    className="flex items-center gap-0.5 px-1 py-0.5 text-xs rounded bg-transparent hover:bg-white/5 transition-colors"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span className="text-xs">Copy</span>
                                  </button>
                                </div>
                                <pre
                                  className={className}
                                  style={{
                                    padding: '0.35rem',
                                    borderRadius: '0.25rem',
                                    overflowX: 'auto',
                                    overflowY: 'auto',
                                    maxHeight: '200px',
                                    margin: '0.1rem 0',
                                    backgroundColor: 'transparent',
                                    color: '#00ff9f',
                                    fontSize: '0.7rem',
                                    lineHeight: '1.2',
                                    textShadow: '0 0 3px #00ff9f',
                                  }}>
                                  <code
                                    className={className}
                                    {...props}
                                    style={{
                                      background: 'transparent',
                                      padding: 0,
                                    }}
                                  >
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <code
                              className="bg-slate-800 text-green-400 px-1 py-[1px] rounded text-xs font-mono leading-tight"
                              {...props}
                            >
                              {children}
                            </code>
                          )
                        },
                        strong: ({ children, ...props }) => (
                          <strong
                            className="font-bold text-green-400"
                            {...props}
                          >
                            {children}
                          </strong>
                        ),
                        hr: () => (
                          <hr className="divider" />
                        ),
                      }}
                    >
                      {streamingMessage}
                    </ReactMarkdown>
                    <span className="inline-block w-1.5 h-3 bg-gradient-to-b from-red-600 via-purple-600 to-blue-600 ml-0.5 animate-pulse"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed right-4 bottom-16 w-8 h-8 bg-gradient-to-r from-red-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:from-red-700 hover:to-purple-700 transition-all duration-200 z-20"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}

      <div className="sticky bottom-0 bg-transparent backdrop-blur-xl p-2">
        <Card className="w-full max-w-xl mx-auto bg-transparent border-0 shadow-none">
          <div className="relative p-[2px] rounded-md bg-gradient-to-r from-red-600 via-purple-600 to-blue-600">
            <div className="bg-gray-900/80 rounded focus-within:ring-1 focus-within:ring-red-400/50 transition-all duration-200 shadow-md p-2 relative">
              <Textarea
                ref={textareaRef}
                id="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="w-full bg-transparent text-white text-sm placeholder-gray-400/70 resize-none focus:outline-none min-h-[48px] max-h-[120px] pr-12 md:text-base"
                disabled={isLoading}
              />
              <div className="absolute right-3 bottom-3">
                {isStreaming ? (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={stopStreaming}
                    title="Stop streaming"
                    className="rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : lastStoppedMessage ? (
                  <Button
                    variant="primary"
                    size="icon"
                    onClick={continueStreaming}
                    title="Continue streaming"
                    className="rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    title="Send message"
                    className="rounded-full w-8 h-8 flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Navigation2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="mt-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={clearMessages}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded text-xs"
                  title="Clear chat"
                >
                  <BrushCleaning className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            Press Enter to send • Shift+Enter for new line, Ryzenth can make mistakes
          </p>
        </Card>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes snowfall {
          0% { transform: translateY(-15px) translateX(0); opacity: 0.8; }
          100% { transform: translateY(80px) translateX(15px); opacity: 0; }
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, -1px); }
          60% { transform: translate(-1px, 1px); }
          80% { transform: translate(1px, -1px); }
          100% { transform: translate(0); }
        }

        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1px; // Thinner line
          background: linear-gradient(90deg, transparent, rgba(255, 0, 0, 0.8), transparent);
          animation: scan 2s linear infinite;
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 5s linear infinite;
        }

        .animate-pulse {
          animation: pulse 1.5s infinite;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .code-block-container {
          position: relative;
        }

        .code-header {
          background: transparent;
          padding: 0.25rem 0.5rem;
          border-top-left-radius: 0.25rem;
          border-top-right-radius: 0.25rem;
          margin-bottom: -0.25rem;
          z-index: 2;
        }

        .table-container {
          overflow-x: auto;
          max-width: 100%;
          margin: 0.25rem 0;
          border: 1px solid #334155;
          border-radius: 0.25rem;
        }

        .compact-table {
          width: auto !important;
          min-width: 100%;
          font-size: 0.7rem !important;
          line-height: 1.2 !important;
          border-collapse: collapse;
        }

        .compact-table th,
        .compact-table td {
          padding: 0.25rem 0.5rem !important;
          border: 1px solid #475569 !important;
          white-space: nowrap;
          font-size: 0.7rem !important;
        }

        .compact-table th {
          background-color: #1e293b !important;
          font-weight: 600;
          color: #f1f5f9;
        }

        .compact-table td {
          background-color: #0f172a !important;
          color: #cbd5e1;
        }

        .compact-table tr:nth-child(even) td {
          background-color: #1e293b !important;
        }

        .horror-font {
          font-family: 'Creepster', cursive;
          animation: glitch 0.5s infinite;
        }

        .snowfall-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 120%;
          overflow: hidden;
        }

        .snowflake {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          opacity: 0.8;
          animation: snowfall 1.5s linear infinite;
          transform-origin: center;
        }

        .divider {
          border: 0;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(255, 0, 0, 0.3), transparent);
          margin: 0.5rem 0;
        }

        button svg {
          min-width: 1rem;
          min-height: 1rem;
        }

        #chat-input {
          padding: 0.5rem 0.75rem;
          line-height: 1.4;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .max-w-4xl {
            max-width: calc(100vw - 0.5rem);
          }

          .code-block-container pre {
            font-size: 0.7rem !important;
          }

          .compact-table {
            font-size: 0.65rem !important;
          }

          .compact-table th,
          .compact-table td {
            padding: 0.2rem 0.4rem !important;
          }

          .horror-font {
            font-size: 2.5rem;
          }

          .snowfall-container .snowflake {
            width: 3px;
            height: 3px;
          }

          button svg {
            min-width: 0.9rem;
            min-height: 0.9rem;
          }

          #chat-input {
            font-size: 0.8rem;
            padding: 0.4rem 0.6rem;
          }
        }

        @font-face {
          font-family: 'Creepster';
          src: url('https://fonts.gstatic.com/s/creepster/v13/EeH1bWChlY5g7yF1VFXt9w.ttf') format('truetype');
        }
      `}</style>
    </div>
  )
}

export default RyzenthChat
