import { useState, useRef, useCallback } from "react"

const VAD_THRESHOLD = 0.045
const VAD_END_SILENCE_MS = 1100

function computeRms(analyser: AnalyserNode) {
  const data = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(data)
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const n = (data[i] - 128) / 128
    sum += n * n
  }
  return Math.sqrt(sum / data.length)
}

export function useVoiceAgent(
  onBlobReady: (blob: Blob, mimeType: string) => void
) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef("audio/webm")
  const vadFrameRef = useRef<number | null>(null)
  const lastSpeechAtRef = useRef(0)

  const stopRecordingTurn = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
    }
  }, [])

  const startRecordingTurn = useCallback(() => {
    if (!streamRef.current || recorderRef.current || isProcessing) return
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeTypeRef.current })
    chunksRef.current = []
    recorderRef.current = recorder
    lastSpeechAtRef.current = performance.now()

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
      chunksRef.current = []
      recorderRef.current = null
      setIsProcessing(true)
      onBlobReady(blob, mimeTypeRef.current)
    }

    recorder.start(250)
  }, [isProcessing, onBlobReady])

  const runVADLoop = useCallback(() => {
    const tick = () => {
      if (!analyserRef.current) return

      const now = performance.now()
      const rms = computeRms(analyserRef.current)
      const speaking = rms >= VAD_THRESHOLD

      if (!isProcessing && !isPlaying) {
        if (speaking) {
          lastSpeechAtRef.current = now
          if (!recorderRef.current) startRecordingTurn()
        } else if (recorderRef.current && now - lastSpeechAtRef.current > VAD_END_SILENCE_MS) {
          stopRecordingTurn()
        }
      }

      vadFrameRef.current = window.requestAnimationFrame(tick)
    }
    vadFrameRef.current = window.requestAnimationFrame(tick)
  }, [isProcessing, isPlaying, startRecordingTurn, stopRecordingTurn])

  const startAgent = useCallback(async () => {
    if (isEnabled) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    streamRef.current = stream
    audioContextRef.current = audioContext
    sourceRef.current = source
    analyserRef.current = analyser
    mimeTypeRef.current = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm"

    setIsEnabled(true)
    setIsProcessing(false)
    runVADLoop()
  }, [isEnabled, runVADLoop])

  const stopAgent = useCallback(async () => {
    setIsEnabled(false)
    setIsProcessing(false)
    setIsPlaying(false)

    if (vadFrameRef.current !== null) {
      window.cancelAnimationFrame(vadFrameRef.current)
      vadFrameRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
    }
    recorderRef.current = null
    chunksRef.current = []

    streamRef.current?.getTracks().forEach(t => t.stop())
    if (audioContextRef.current) await audioContextRef.current.close()

    streamRef.current = null
    audioContextRef.current = null
    sourceRef.current = null
    analyserRef.current = null
  }, [])

  const onTurnProcessed = useCallback(() => {
    setIsProcessing(false)
  }, [])

  const setAudioPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [])

  return {
    isEnabled,
    isProcessing,
    isPlaying,
    startAgent,
    stopAgent,
    onTurnProcessed,
    setAudioPlaying,
  }
}
