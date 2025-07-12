'use client'

interface TimerProps {
    onStart: () => void
    onStop: () => void
    message: string
    setMessage: (val: string) => void
    preset: string
    setPreset: (val: string) => void
    customMinutes: number
    setCustomMinutes: (val: number) => void
}

export default function Timer({
                                  onStart,
                                  onStop,
                                  message,
                                  setMessage,
                                  preset,
                                  setPreset,
                                  customMinutes,
                                  setCustomMinutes,
                              }: TimerProps) {
    return (
        <div className="space-y-4">
            <div className="space-x-2">
                <button
                    className="bg-green-500 text-white px-4 py-2 rounded"
                    onClick={onStart}
                >
                    시작
                </button>
                <button
                    className="bg-red-500 text-white px-4 py-2 rounded"
                    onClick={onStop}
                >
                    정지
                </button>
            </div>

            <div className="space-x-2">
                <label>시간 선택:</label>
                <select
                    className="border px-2 py-1"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                >
                    <option value="25">25분</option>
                    <option value="50">50분</option>
                    <option value="custom">직접 입력</option>
                </select>
                {preset === 'custom' && (
                    <input
                        type="number"
                        className="border px-2 py-1 w-20"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    />
                )}
            </div>

            <input
                className="border px-2 py-1 w-full"
                value={message}
                placeholder="상태 메시지"
                onChange={(e) => setMessage(e.target.value)}
            />
        </div>
    )
}
