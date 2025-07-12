'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface TimerProps {
    startTs: number | null
    duration: number
    isRunning: boolean
    onStart: () => void
    onStop: () => void
    preset: '25' | '50' | 'custom'
    setPreset: (v: '25' | '50' | 'custom') => void
    customMinutes: number
    setCustomMinutes: (v: number) => void
    message: string
    setMessage: (v: string) => void
    color: string
}

export default function Timer({
                                  startTs,
                                  duration,
                                  isRunning,
                                  onStart,
                                  onStop,
                                  preset,
                                  setPreset,
                                  customMinutes,
                                  setCustomMinutes,
                                  message,
                                  setMessage,
                                  color,
                              }: TimerProps) {
    const [now, setNow] = useState(() => Date.now())

    // 매초 now 업데이트
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    // 남은 시간 계산
    const remainSec =
        isRunning && startTs
            ? Math.max(0, startTs + duration - Math.floor(now / 1000))
            : 0
    const minutes = String(Math.floor(remainSec / 60)).padStart(2, '0')
    const seconds = String(remainSec % 60).padStart(2, '0')
    const percent = duration > 0 ? remainSec / duration : 0

    // 원형 그래프 설정
    const radius = 90
    const circumference = 2 * Math.PI * radius
    const dashOffset = circumference * (1 - percent)

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="relative w-64 h-64">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle
                        cx="100"
                        cy="100"
                        r="90"
                        stroke="#e5e7eb"
                        strokeWidth="10"
                        fill="none"
                    />
                    <motion.circle
                        cx="100"
                        cy="100"
                        r="90"
                        stroke={color}
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ ease: 'linear', duration: 1 }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-mono" style={{ color }}>
                        {minutes}:{seconds}
                    </div>
                    <div className="mt-2 flex space-x-2">
                        <button
                            onClick={onStart}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-full active:scale-95"
                        >
                            시작
                        </button>
                        <button
                            onClick={onStop}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-full active:scale-95"
                        >
                            정지
                        </button>
                    </div>
                    <div className="flex space-x-2 items-center mt-4">
                        <select
                            value={preset}
                            onChange={(e) => setPreset(e.target.value as any)}
                            className="border rounded-full px-3 py-1"
                        >
                            <option value="25">25분</option>
                            <option value="50">50분</option>
                            <option value="custom">커스텀</option>
                        </select>
                        {preset === 'custom' && (
                            <input
                                type="number"
                                value={customMinutes}
                                onChange={(e) => setCustomMinutes(+e.target.value)}
                                className="border rounded-full px-3 py-1 w-20"
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-4 w-full max-w-md">
                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="상태 메시지"
                    className="w-full border rounded-full px-3 py-2 text-sm"
                />
            </div>
        </div>
    )
}
