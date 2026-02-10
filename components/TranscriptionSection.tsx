
import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { transcribeAudio } from '../services/geminiService';
import { createPcmBlob } from '../utils/audio';
import { TranslationKeys } from '../utils/i18n';

interface TranscriptionProps {
  t: TranslationKeys;
}

export const TranscriptionSection: React.FC<TranscriptionProps> = ({ t }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      chunksRef.current = [];
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Please allow microphone access to use transcription.");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsLoading(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    const totalLength = chunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    try {
      const pcm = createPcmBlob(result);
      const text = await transcribeAudio(pcm.data);
      setTranscription(prev => (prev ? `${prev}\n${text}` : text));
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      setIsLoading(false);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  return (
    <div className="p-8 glass rounded-[40px] border border-white/5 shadow-2xl">
      <h2 className="text-xl font-black mb-6 flex items-center gap-2">
        <span className="text-emerald-400">Audio</span> {t.transcription}
      </h2>
      <div className="min-h-[200px] bg-black/30 border border-white/5 rounded-[32px] p-8 mb-6 text-zinc-300 leading-relaxed italic">
        {transcription || t.transcriptionPlaceholder}
        {isLoading && <span className="ml-2 inline-block animate-pulse text-indigo-400 font-bold">{t.processing}</span>}
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {!isRecording ? (
          <Button onClick={startRecording} className="flex-1 py-5 rounded-2xl font-black text-lg bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {t.startRecording}
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="danger" className="flex-1 py-5 rounded-2xl font-black text-lg animate-pulse shadow-lg shadow-red-900/40">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" />
            </svg>
            {t.stopRecording}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setTranscription('')} disabled={!transcription} className="px-10 rounded-2xl font-black bg-zinc-800">
          {t.clear}
        </Button>
      </div>
    </div>
  );
};
