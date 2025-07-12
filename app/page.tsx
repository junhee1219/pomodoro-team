'use client'

import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export default function HomePage() {
  const router = useRouter()

  const createRoom = () => {
    const roomId = uuidv4().slice(0, 6) // 짧은 랜덤 ID 생성
    router.push(`/room/${roomId}`)
  }

  return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-6">Pomodoro Team</h1>
        <button
            onClick={createRoom}
            className="bg-blue-600 text-white px-6 py-3 rounded text-lg"
        >
          방 만들기
        </button>
      </div>
  )
}
