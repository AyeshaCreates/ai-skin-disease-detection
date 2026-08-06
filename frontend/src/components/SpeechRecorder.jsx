import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function SpeechRecorder({ language, onTranscript, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  // Map our language selection code to the recognition locale codes
  const getLanguageLocale = (lang) => {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'kn': return 'kn-IN';
      default: return 'en-IN';
    }
  };

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please type symptoms manually.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getLanguageLocale(language);

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'no-speech') {
        setError("No speech was detected. Please try again.");
      } else if (event.error === 'not-allowed') {
        setError("Microphone permission denied. Please allow access to record symptoms.");
      } else {
        setError(`Recording error: ${event.error}. Please try typing.`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript]);

  // Update language locale when prop changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getLanguageLocale(language);
    }
  }, [language]);

  const toggleRecording = () => {
    if (disabled || error && !recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        setError(null);
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setError("Could not start recording. Please try typing your symptoms.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={disabled}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse shadow-md hover:bg-red-600'
              : 'bg-medical-teal/10 text-medical-teal hover:bg-medical-teal/20'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4 animate-spin" />
              Listening... Stop
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Speak Symptoms
            </>
          )}
        </button>
        <span className="text-xs text-slate-500 font-medium">
          {isRecording 
            ? "Speak now. The microphone will turn off automatically when you stop." 
            : `Voice input language set to: ${language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Kannada'}`}
        </span>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
