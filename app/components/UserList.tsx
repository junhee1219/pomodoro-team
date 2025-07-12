'use client'

import { useEffect, useState } from 'react'

interface UserStatus {
    user_id: string
    state: string
    start_ts: number
    duration: number
    message: string | null
    color?: string
}

export default function UserList({ list }: { list: UserStatus[] }) {
    const [now, setNow] = useState(Math.floor(Date.now() / 1000))

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Math.floor(Date.now() / 1000))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div>
            <h2 className="text-lg font-semibold mt-6 mb-2">참여자 상태</h2>
            <ul className="space-y-1">
                {list.map((u) => {
                    const remaining = u.state === 'running' ? Math.max(0, u.start_ts + u.duration - now) : 0
                    const endTime = new Date((u.start_ts + u.duration) * 1000).toLocaleTimeString()

                    return (
                        <li
                            key={u.user_id}
                            className="border p-2 rounded"
                            style={{ borderLeft: `6px solid ${u.color || '#999'}` }}
                        >
                            <div>
                                <b>{u.user_id}</b> ({u.state})
                            </div>
                            <div>
                                남은 시간:{' '}
                                {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
                            </div>
                            <div>끝나는 시각: {u.state === 'running' ? endTime : '-'}</div>
                            <div>메시지: {u.message || '-'}</div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
