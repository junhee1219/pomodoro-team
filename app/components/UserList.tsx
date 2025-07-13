'use client'

import {useEffect, useState} from 'react'
import {motion} from 'framer-motion'

interface UserStatus {
    user_id: string
    state: string
    start_ts: number
    duration: number
    message: string | null
    color?: string
}

interface UserListProps {
    list: UserStatus[]
    removeUser: (user_id: string) => void
    currentUser: string
}

export default function UserList({list, removeUser, currentUser}: UserListProps) {
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

    // 매초 now 업데이트
    useEffect(() => {
        const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
        return () => clearInterval(timer)
    }, [])

    // 남은 시간 기준 정렬
    const sorted = [...list].sort((a, b) => {
        const aRemain = a.state === 'running' ? a.start_ts + a.duration - now : Infinity
        const bRemain = b.state === 'running' ? b.start_ts + b.duration - now : Infinity
        return aRemain - bRemain
    })

    return (
        <div className="space-y-4">
            {sorted.map((u) => {
                const remainSec = u.state === 'running' ? Math.max(0, u.start_ts + u.duration - now) : 0
                const minutes = String(Math.floor(remainSec / 60)).padStart(2, '0')
                const seconds = String(remainSec % 60).padStart(2, '0')
                const percent = u.duration > 0 ? remainSec / u.duration : 0
                const radius = 20
                const circumference = 2 * Math.PI * radius
                const dashOffset = circumference * (1 - percent)
                const strokeColor = remainSec > 0 ? u.color || '#3b82f6' : '#d1d5db'

                return (
                    <div
                        key={u.user_id}
                        className="flex items-center space-x-4 p-3 border rounded-lg shadow-sm bg-white"
                    >
                        {/* 원형 진행 표시 */}
                        <svg width="50" height="50" className="transform -rotate-90">
                            <circle
                                cx="25"
                                cy="25"
                                r={radius}
                                stroke="#e5e7eb"
                                strokeWidth="5"
                                fill="none"
                            />
                            <motion.circle
                                cx="25"
                                cy="25"
                                r={radius}
                                stroke={strokeColor}
                                strokeWidth="5"
                                fill="none"
                                strokeDasharray={circumference}
                                animate={{strokeDashoffset: dashOffset}}
                                transition={{ease: 'linear', duration: 1}}
                            />
                        </svg>

                        {/* 사용자 정보 */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                <span className="font-semibold" style={{color: u.color || 'black'}}>
                  {u.user_id}{u.user_id === currentUser && ' (나)'}
                </span>
                                <span className="text-sm text-gray-600">
                  {u.state === 'running'
                      ? `종료 ${new Date((u.start_ts + u.duration) * 1000).toLocaleTimeString()}`
                      : '정지됨'}
                </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1 flex justify-between">
                                <span className="truncate max-w-xs">{u.message || '-'}</span>
                                <span className="font-mono text-sm">
                  {minutes}:{seconds}
                </span>
                            </div>
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => removeUser(u.user_id)}
                        >
                            삭제
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
