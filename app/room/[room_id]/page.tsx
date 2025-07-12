'use client'

import {useEffect, useState} from 'react'
import {useParams} from 'next/navigation'
import {supabase} from '@/lib/supabaseClient'
import Timer from '@/app/components/Timer'
import UserList from '@/app/components/UserList'

interface UserStatus {
    user_id: string
    state: string
    start_ts: number
    duration: number
    message: string | null
}

export default function RoomPage() {
    const {room_id} = useParams() as { room_id: string }
    const [nickname, setNickname] = useState('')
    const [inputName, setInputName] = useState('')
    const [statusList, setStatusList] = useState<UserStatus[]>([])
    const [timerState, setTimerState] = useState<'idle' | 'running'>('idle')
    const [duration, setDuration] = useState(25 * 60)
    const [startTs, setStartTs] = useState<number | null>(null)
    const [message, setMessage] = useState('')

    const [preset, setPreset] = useState<'25' | '50' | 'custom'>('25')
    const [customMinutes, setCustomMinutes] = useState(30)

    // pallet 어케함?
    const colorOptions = ['#f87171', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']
    const [selectedColor, setSelectedColor] = useState(colorOptions[0])


    useEffect(() => {
        const savedName = localStorage.getItem('nickname')
        const savedColor = localStorage.getItem('color')

        if (savedName) {
            setInputName(savedName)
            setNickname(savedName)  // ✅ 이거 추가해야 자동 진입
        }

        if (savedColor) {
            setSelectedColor(savedColor)
        }
    }, [])

    const handleSetNickname = () => {
        setNickname(inputName)
        localStorage.setItem('nickname', inputName)
        localStorage.setItem('color', selectedColor)
    }

    useEffect(() => {
        if (!room_id) return

        // 최초 한 번 기존 데이터 조회
        supabase
            .from('statuses')
            .select('*')
            .eq('room_id', room_id)
            .then(({data}) => {
                if (data) {
                    setStatusList(data as UserStatus[])
                }
            })

        // 실시간 구독으로 갱신
        const channel = supabase
            .channel(`room:${room_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'statuses',
                    filter: `room_id=eq.${room_id}`,
                },
                (payload) => {
                    setStatusList((prev) => {
                        const filtered = prev.filter((p) => p.user_id !== payload.new.user_id)
                        return [...filtered, payload.new]
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [room_id])


    useEffect(() => {
        if (timerState !== 'running' || !startTs) return

        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000)
            if (startTs + duration <= now) {
                handleStop()
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [timerState, startTs, duration])

    useEffect(() => {
        if (!nickname || timerState === 'idle') return
        const timeout = setTimeout(() => {
            supabase.from('statuses').upsert({
                room_id,
                user_id: nickname,
                state: timerState,
                start_ts: startTs ?? 0,
                duration,
                message,
                color: selectedColor,
            })
        }, 500)
        return () => clearTimeout(timeout)
    }, [message])

    const handleStart = async () => {
        const ts = Math.floor(Date.now() / 1000)
        const actualDuration =
            preset === '25' ? 25 * 60 :
                preset === '50' ? 50 * 60 :
                    customMinutes * 60

        setStartTs(ts)
        setDuration(actualDuration)
        setTimerState('running')

        await supabase.from('statuses').upsert({
            room_id,
            user_id: nickname,
            state: 'running',
            start_ts: ts,
            duration: actualDuration,
            message,
            color: selectedColor,
        })
    }

    const handleStop = async () => {
        setTimerState('idle')
        setStartTs(null)

        await supabase.from('statuses').upsert({
            room_id,
            user_id: nickname,
            state: 'idle',
            start_ts: 0,
            duration: 0,
            message,
            color: selectedColor,
        })
    }

    if (!nickname) {
        return (
            <div className="p-8">
                <h1 className="text-xl font-bold mb-2">닉네임 입력</h1>
                <input
                    className="border px-2 py-1 mr-2"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                />
                <div className="flex space-x-2 mt-4">
                    {colorOptions.map((c) => (
                        <button
                            key={c}
                            className={`w-6 h-6 rounded-full border-2 ${
                                selectedColor === c ? 'border-black' : 'border-white'
                            }`}
                            style={{backgroundColor: c}}
                            onClick={() => setSelectedColor(c)}
                        />
                    ))}
                </div>
                <button
                    className="bg-blue-500 text-white px-4 py-1 mt-4 rounded"
                    onClick={handleSetNickname}
                >
                    시작
                </button>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-xl font-bold">방: {room_id}</h1>

            <Timer
                onStart={handleStart}
                onStop={handleStop}
                message={message}
                setMessage={setMessage}
                preset={preset}
                setPreset={setPreset}
                customMinutes={customMinutes}
                setCustomMinutes={setCustomMinutes}
            />

            <UserList list={statusList}/>
        </div>
    )
}
