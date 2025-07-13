'use client'

import {useEffect, useState} from 'react'
import {useParams, useRouter} from 'next/navigation'
import {supabase} from '@/lib/supabaseClient'
import Timer from '@/app/components/Timer'
import UserList from '@/app/components/UserList'

interface UserStatus {
    user_id: string
    state: string
    start_ts: number
    duration: number
    message: string | null
    color?: string
}

export default function RoomPage() {
    const {room_id} = useParams() as { room_id: string }
    const router = useRouter()

    // 방 제목 관리
    const [roomTitle, setRoomTitle] = useState('')
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleInput, setTitleInput] = useState('')

    // 사용자 설정
    const [nickname, setNickname] = useState('')
    const [inputName, setInputName] = useState('')
    const [editingName, setEditingName] = useState(false)
    const colorOptions = ['#f87171', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']
    const [selectedColor, setSelectedColor] = useState(colorOptions[0])

    // 포모도로 설정
    const [preset, setPreset] = useState<'25' | '50' | 'custom'>('25')
    const [customMinutes, setCustomMinutes] = useState(30)
    const [duration, setDuration] = useState(25 * 60)
    const [message, setMessage] = useState('')
    const [timerState, setTimerState] = useState<'idle' | 'running'>('idle')
    const [startTs, setStartTs] = useState<number | null>(null)

    // 참여자 상태 리스트
    const [statusList, setStatusList] = useState<UserStatus[]>([])

    // 초기 설정 로드
    useEffect(() => {
        const savedName = localStorage.getItem('nickname')
        const savedColor = localStorage.getItem('color')
        if (savedName) {
            setInputName(savedName)
            setNickname(savedName)
        }
        if (savedColor) setSelectedColor(savedColor)
    }, [])

    // 초기 데이터 조회 및 구독
    useEffect(() => {
        if (!room_id) return;

        const myName = localStorage.getItem('nickname');

        const fetchInitialData = async () => {
            const {data: roomData} = await supabase
                .from('rooms')
                .select('title')
                .eq('room_id', room_id)
                .single<{ title: string }>();
            if (roomData) {
                setRoomTitle(roomData.title);
                setTitleInput(roomData.title);
            }

            const {data: statusData} = await supabase
                .from('statuses')
                .select('*')
                .eq('room_id', room_id);
            if (statusData) {
                setStatusList(statusData);
                if (myName) {
                    const myStatus = statusData.find(s => s.user_id === myName);
                    if (myStatus) {
                        setTimerState(myStatus.state as any);
                        setStartTs(myStatus.state === 'running' ? myStatus.start_ts : null);
                        setDuration(myStatus.duration);
                        setMessage(myStatus.message || '');
                        const d = myStatus.duration;
                        if (d === 25 * 60) setPreset('25');
                        else if (d === 50 * 60) setPreset('50');
                        else {
                            setPreset('custom');
                            setCustomMinutes(d > 0 ? d / 60 : 30);
                        }
                    }
                }
            }
        };

        fetchInitialData();

        const channel = supabase
            .channel(`room:${room_id}`, {config: {broadcast: {self: false}}})
            .on(
                'postgres_changes' as any,
                {event: '*', schema: 'public', table: 'rooms', filter: `room_id=eq.${room_id}`},
                (payload) => {
                    if (payload.new?.title) setRoomTitle(payload.new.title);
                }
            )
            .on(
                'postgres_changes' as any,
                {event: '*', schema: 'public', table: 'statuses', filter: `room_id=eq.${room_id}`},
                (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: UserStatus; old: UserStatus }) => {
                    console.log('[Supabase Realtime] Event received:', payload);
                    setStatusList(prev => {
                        let newList = [...prev];
                        switch (payload.eventType) {
                            case 'INSERT':
                                newList.push(payload.new as UserStatus);
                                break;
                            case 'UPDATE':
                                newList = newList.map(u => u.user_id === payload.new.user_id ? payload.new as UserStatus : u);
                                break;
                            case 'DELETE':
                                newList = newList.filter(u => u.user_id !== payload.old.user_id);
                                break;
                        }
                        console.log('[Supabase Realtime] State updated:', {oldList: prev, newList});
                        return newList;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room_id]);


    // 방 제목 저장
    const saveTitle = async () => {
        await supabase.from('rooms').upsert({room_id, title: titleInput})
        setRoomTitle(titleInput)
        setEditingTitle(false)
    }

    // 닉네임 저장
    const saveName = async () => {
        const old = nickname
        const neu = inputName
        await supabase.from('statuses').upsert({
            room_id,
            user_id: neu,
            state: timerState,
            start_ts: startTs ?? 0,
            duration,
            message,
            color: selectedColor
        })
        if (old && old !== neu) await supabase.from('statuses').delete().match({room_id, user_id: old})
        setNickname(neu)
        localStorage.setItem('nickname', neu)
        setEditingName(false)
    }

    // 색상 변경 즉시 반영
    const changeColor = async (c: string) => {
        setSelectedColor(c)
        localStorage.setItem('color', c)
        if (nickname) {
            await supabase.from('statuses').upsert({
                room_id,
                user_id: nickname,
                state: timerState,
                start_ts: startTs ?? 0,
                duration,
                message,
                color: c
            })
        }
    }

    // 타이머 설정 즉시 반영
    const changePreset = (p: '25' | '50' | 'custom') => {
        setPreset(p)
        const sec = p === '25' ? 25 * 60 : p === '50' ? 50 * 60 : customMinutes * 60
        setDuration(sec)
        if (nickname) supabase.from('statuses').upsert({
            room_id,
            user_id: nickname,
            state: timerState,
            start_ts: startTs ?? 0,
            duration: sec,
            message,
            color: selectedColor
        })
    }
    const changeCustom = (m: number) => {
        setCustomMinutes(m)
        const sec = m * 60
        setDuration(sec)
        if (nickname) supabase.from('statuses').upsert({
            room_id,
            user_id: nickname,
            state: timerState,
            start_ts: startTs ?? 0,
            duration: sec,
            message,
            color: selectedColor
        })
    }

    const handleMessageUpdate = async () => {
        if (nickname) {
            await supabase.from('statuses').upsert({
                room_id,
                user_id: nickname,
                state: timerState,
                start_ts: startTs ?? 0,
                duration,
                message,
                color: selectedColor
            });
        }
    };

    // 참여자 삭제
    const removeUser = async (user: string) => {
        await supabase.from('statuses').delete().match({room_id, user_id: user})
        if (user === nickname) {
            localStorage.removeItem('nickname');
            localStorage.removeItem('color');
            router.push('/');
        } else {
            setStatusList(prev => prev.filter(u => u.user_id !== user));
        }
    }

    // 시작/정지
    const handleStart = async () => {
        const ts = Math.floor(Date.now() / 1000)
        const sec = preset === '25' ? 25 * 60 : preset === '50' ? 50 * 60 : customMinutes * 60
        setStartTs(ts);
        setDuration(sec);
        setTimerState('running')

        const newStatus = {
            room_id,
            user_id: nickname,
            state: 'running',
            start_ts: ts,
            duration: sec,
            message,
            color: selectedColor
        };
        setStatusList(prev => [...prev.filter(u => u.user_id !== nickname), newStatus]);
        await supabase.from('statuses').upsert(newStatus)
    }
    const handleStop = async () => {
        setTimerState('idle');
        setStartTs(null)
        const newStatus = {
            room_id,
            user_id: nickname,
            state: 'idle',
            start_ts: 0,
            duration: 0,
            message,
            color: selectedColor
        };
        setStatusList(prev => [...prev.filter(u => u.user_id !== nickname), newStatus]);
        await supabase.from('statuses').upsert(newStatus)
    }

    // 닉네임 미입력 시 폼
    if (!nickname) return (
        <div className="p-6 max-w-md mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-center">{roomTitle || room_id}</h1>
            <input className="border rounded px-3 py-2 w-full" placeholder="닉네임" value={inputName}
                   onChange={e => setInputName(e.target.value)}/>
            <div className="flex space-x-2">
                {colorOptions.map(c => <button key={c}
                                               className={`w-6 h-6 rounded-full border-2 ${selectedColor === c ? 'border-black' : 'border-gray-200'}`}
                                               style={{backgroundColor: c}} onClick={() => changeColor(c)}/>)}
            </div>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" onClick={saveName}>확인
            </button>
        </div>
    )

    return (
        <div className="p-6 grid grid-cols-10 gap-6">
            <div className="col-span-7 space-y-4">
                <div className="flex items-center space-x-2">
                    {editingTitle ? (
                        <><input className="border rounded px-2 py-1 w-64" value={titleInput}
                                 onChange={e => setTitleInput(e.target.value)}/>
                            <button className="text-sm text-blue-600" onClick={saveTitle}>저장</button>
                            <button className="text-sm text-gray-600" onClick={() => setEditingTitle(false)}>취소</button>
                        </>
                    ) : (
                        <><h1 className="text-xl font-bold flex-1">{roomTitle || room_id}</h1>
                            <button className="text-sm text-blue-600" onClick={() => {
                                setEditingTitle(true);
                                setTitleInput(roomTitle)
                            }}>수정
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                        {editingName ? (
                            <><input className="border rounded px-2 py-1 flex-1" value={inputName}
                                     onChange={e => setInputName(e.target.value)}/>
                                <button className="text-sm text-blue-600" onClick={saveName}>저장</button>
                                <button className="text-sm text-gray-600" onClick={() => setEditingName(false)}>취소
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center space-x-4 flex-1">
                                <span className="font-semibold" style={{color: selectedColor}}>{nickname}</span>
                                <div className="flex space-x-2">
                                    {colorOptions.map(c => <button key={c}
                                                                   className={`w-6 h-6 rounded-full border-2 ${selectedColor === c ? 'border-black' : 'border-gray-200'}`}
                                                                   style={{backgroundColor: c}}
                                                                   onClick={() => changeColor(c)}/>)}
                                </div>
                                <button className="text-sm text-blue-600" onClick={() => setEditingName(true)}>이름변경
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <Timer startTs={startTs} duration={duration} isRunning={timerState === 'running'} onStart={handleStart}
                       onStop={handleStop} preset={preset} setPreset={changePreset} customMinutes={customMinutes}
                       setCustomMinutes={changeCustom} message={message} setMessage={setMessage}
                       onMessageBlur={handleMessageUpdate} color={selectedColor}/>
            </div>
            <div className="col-span-3">
                <h2 className="text-lg font-semibold mb-2">참여자</h2>
                <UserList list={statusList} removeUser={removeUser} currentUser={nickname}/>
                <div className="mt-4 text-center">
                    <button className="text-sm text-red-500" onClick={() => removeUser(nickname)}>나가기</button>
                </div>
            </div>
        </div>
    )
}
