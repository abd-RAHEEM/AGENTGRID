'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useEnergyStore, House } from '../../store/useEnergyStore';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Language = 'english' | 'hindi' | 'telugu' | 'urdu';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'hindi',   label: 'हिन्दी' },
  { value: 'telugu',  label: 'తెలుగు' },
  { value: 'urdu',    label: 'اردو' },
];

interface Message {
  id: string;
  role: 'user' | 'aria';
  content: string;
  isAudio: boolean;
  timestamp: string;
}

interface PerHouseContribution {
  solar: number;
  battery: number;
  grid: number;
  unmet: number;
  total: number;
}

interface ChatPanelProps {
  selectedHouse: House | null;
  perHouseContribution: PerHouseContribution | null;
}

// Lightweight local fallback when backend is offline
function mockAriaReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.match(/bill|cost|₹|rupee|inr|price/))
    return "Your current estimated bill is ₹2,850, down ~10% from last month. Shift EV charging to 10 PM–6 AM for maximum savings.";
  if (lower.match(/ev|charging|vehicle|car/))
    return "Best EV charging window: 10 PM – 6 AM (off-peak) or 11 AM – 3 PM (solar surplus). Estimated saving: ₹180/month.";
  if (lower.match(/solar|panel|sun|generation/))
    return "Solar is generating at current capacity. Use surplus energy to charge your battery or EV rather than exporting.";
  if (lower.match(/battery|storage|soc/))
    return "Battery stores surplus solar for evening use. Keeping SoC between 20–90% maximizes lifespan.";
  if (lower.match(/grid|outage|failure/))
    return "During a grid outage, the community relies on solar + battery island mode. Critical loads are prioritized automatically.";
  return "I can help you reduce energy bills, plan EV charging, and understand your solar performance. What would you like to know?";
}

export default function ChatPanel({ selectedHouse, perHouseContribution }: ChatPanelProps) {
  const community      = useEnergyStore((s) => s.community);
  const activeScenario = useEnergyStore((s) => s.activeScenario);
  const backendConnected = useEnergyStore((s) => s.backendConnected);

  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'aria',
    content: 'Hello! I am ARIA, your energy advisor. Select a house and ask me about its energy usage, costs, or optimizations.',
    isAudio: false,
    timestamp: '',
  }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('english');
  const [audioError, setAudioError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isRecording, audioBlob, startRecording, stopRecording, clearAudio, error: micError } =
    useVoiceRecorder();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When audioBlob is ready after stopping recording, send it
  useEffect(() => {
    if (audioBlob && !isRecording) {
      handleSendAudio(audioBlob);
      clearAudio();
    }
  }, [audioBlob, isRecording]);

  const buildHouseContext = () => {
    if (!selectedHouse || !perHouseContribution) return undefined;
    return {
      house_id: selectedHouse.id,
      consumption: selectedHouse.consumption,
      solar_contribution_pct: selectedHouse.solarContribution,
      energy_source: selectedHouse.energySource,
      solar_supply_kwh: Math.round(perHouseContribution.solar * 100) / 100,
      battery_supply_kwh: Math.round(perHouseContribution.battery * 100) / 100,
      grid_supply_kwh: Math.round(perHouseContribution.grid * 100) / 100,
    };
  };

  const buildContext = () => ({
    solarGeneration: community.solarGeneration,
    batteryLevel:    community.batteryLevel,
    gridImport:      community.gridImport,
    evCount:         community.evCount,
    renewableUsage:  community.renewableUsage,
    activeScenario,
    selectedHouse: buildHouseContext(),
  });

  const appendMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    setMessages((prev) => [...prev, { ...msg, id: Date.now().toString(), timestamp: ts }]);
  };

  const callChat = async (userText: string, wasAudio: boolean): Promise<string> => {
    if (!backendConnected) return mockAriaReply(userText);

    const history = messages
      .filter((m) => m.id !== '0')
      .slice(-10)
      .map((m) => ({ role: m.role === 'aria' ? 'assistant' : 'user', content: m.content }));

    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:  userText,
        language,
        history,
        context: buildContext(),
      }),
    });

    if (!res.ok) return mockAriaReply(userText);

    const data = await res.json();
    // Prefer structured.message if present, otherwise raw reply
    if (data.structured?.message) return data.structured.message;
    if (data.reply) {
      // Strip JSON wrapping if raw reply is a JSON string
      try {
        const parsed = JSON.parse(data.reply);
        return parsed.message || data.reply;
      } catch {
        return data.reply;
      }
    }
    return mockAriaReply(userText);
  };

  const playTTS = async (text: string) => {
    if (!backendConnected) return;
    try {
      const res = await fetch(`${BACKEND_URL}/voice/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.audio_base64) {
        const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
        const audio = new Audio(audioSrc);
        await audio.play();
      }
    } catch {
      setAudioError('Audio playback failed.');
    }
  };

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    appendMessage({ role: 'user', content: text, isAudio: false });
    setInputText('');
    setIsLoading(true);

    try {
      const reply = await callChat(text, false);
      appendMessage({ role: 'aria', content: reply, isAudio: false });
      // Text input → text-only response, no TTS
    } catch {
      appendMessage({ role: 'aria', content: 'Sorry, I encountered an error. Please try again.', isAudio: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    setIsLoading(true);
    let transcript = '';

    try {
      if (backendConnected) {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');
        formData.append('language', language);
        const sttRes = await fetch(`${BACKEND_URL}/voice/stt?language=${language}`, {
          method: 'POST',
          body: formData,
        });
        if (sttRes.ok) {
          const sttData = await sttRes.json();
          transcript = sttData.transcript || '';
        }
      }
      if (!transcript) transcript = '[Voice message — transcription unavailable]';

      appendMessage({ role: 'user', content: transcript, isAudio: true });

      const reply = await callChat(transcript, true);
      appendMessage({ role: 'aria', content: reply, isAudio: true });

      // Voice input → voice response
      await playTTS(reply);
    } catch {
      appendMessage({ role: 'aria', content: 'Voice processing failed. Please try text input.', isAudio: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #212121',
      margin: '16px',
      boxShadow: '4px 4px 0px 0px #212121',
      display: 'flex',
      flexDirection: 'column',
      height: '380px',
    }}>
      {/* Header */}
      <div style={{
        background: '#E8EAEB',
        borderBottom: '2px solid #212121',
        padding: '8px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'monospace', fontSize: '10px', fontWeight: 'bold',
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#212121',
        }}>
          ▸ ARIA ENERGY ADVISOR
        </span>
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          style={{
            fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold',
            border: '1px solid #212121', background: '#FFFFFF', color: '#212121',
            padding: '2px 4px', cursor: 'pointer', outline: 'none',
            textTransform: 'uppercase',
          }}
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user' ? '#212121' : '#F5F5F5',
              color: msg.role === 'user' ? '#FFFFFF' : '#212121',
              border: '1px solid #212121',
              padding: '8px 10px',
              fontFamily: 'monospace',
              fontSize: '10px',
              lineHeight: '1.5',
              position: 'relative',
            }}>
              {msg.isAudio && (
                <span style={{
                  fontSize: '8px', marginRight: '4px',
                  opacity: 0.6, display: 'inline',
                }}>🎤 </span>
              )}
              {msg.content}
              {msg.timestamp && (
                <div style={{
                  fontSize: '7px', opacity: 0.5, marginTop: '3px',
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                }}>
                  {msg.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: '#F5F5F5', border: '1px solid #212121',
              padding: '8px 12px', fontFamily: 'monospace', fontSize: '10px',
              color: '#6B7280', letterSpacing: '0.2em',
            }}>
              ARIA THINKING...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error strip */}
      {(micError || audioError) && (
        <div style={{
          background: '#FEE2E2', borderTop: '1px solid #DC2626',
          padding: '4px 12px', fontFamily: 'monospace', fontSize: '9px', color: '#DC2626',
        }}>
          ⚠ {micError || audioError}
        </div>
      )}

      {/* Input area */}
      <div style={{
        borderTop: '2px solid #212121',
        padding: '8px 10px',
        display: 'flex',
        gap: '6px',
        flexShrink: 0,
        background: '#FFFFFF',
      }}>
        {/* Mic button */}
        <button
          onClick={handleMicClick}
          disabled={isLoading}
          style={{
            width: '34px', height: '34px', flexShrink: 0,
            background: isRecording ? '#DC2626' : '#FFFFFF',
            border: `2px solid ${isRecording ? '#DC2626' : '#212121'}`,
            cursor: 'pointer', fontSize: '14px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            animation: isRecording ? 'pulse-border 1s infinite' : 'none',
          }}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isRecording}
          placeholder={isRecording ? 'Recording...' : 'Ask ARIA about your energy...'}
          style={{
            flex: 1,
            border: '2px solid #212121',
            padding: '6px 10px',
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#212121',
            background: '#FFFFFF',
            outline: 'none',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSendText}
          disabled={!inputText.trim() || isLoading || isRecording}
          style={{
            background: inputText.trim() && !isLoading ? '#FF6600' : '#E8EAEB',
            color: inputText.trim() && !isLoading ? '#FFFFFF' : '#6B7280',
            border: '2px solid #212121',
            padding: '6px 14px',
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
            letterSpacing: '0.05em',
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
