"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Radio,
  Trash2,
  Terminal,
} from "lucide-react";
import { useGraphStore } from "@/store/graphStore";
import { CLIENT_PRESETS } from "@/lib/api";

export default function VoiceInput() {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  const { parsePrompt, isParsing, activePreset, loadGraph } = useGraphStore();

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + " ";
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setInputText((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
          }
          setInterimText(currentInterim);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimText("");
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      alert("Web Speech API is not supported in this browser. Please use the text input or demo presets.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isParsing) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    await parsePrompt(inputText);
  };

  const handleSelectPreset = async (key: "ecommerce" | "fintech" | "iot") => {
    if (isParsing) return;
    const presetData = CLIENT_PRESETS[key];
    if (presetData) {
      setInputText(presetData.summary || "");
      await loadGraph(presetData, key);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl glass-panel text-slate-100 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Architecture Ingestion
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          NLP &amp; Speech Engine Active
        </span>
      </div>

      {/* Voice & Prompt Input Card */}
      <form onSubmit={handleFormSubmit} className="relative flex flex-col gap-2">
        <div className="relative rounded-xl border border-slate-700/80 bg-slate-950/70 p-3 focus-within:border-sky-500/80 transition-colors">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit(e);
              }
            }}
            placeholder="Speak or type architecture (e.g. 'React frontend connects to API Gateway, routes to Auth Service and Postgres database...')"
            rows={3}
            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed font-sans"
          />

          {/* Interim transcript animation */}
          {interimText && (
            <div className="text-[11px] font-mono text-sky-400/80 italic mt-1 animate-pulse">
              &ldquo;{interimText}&rdquo;
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-2">
            <div className="flex items-center gap-2">
              {/* Mic Record Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isListening
                    ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
                title={isListening ? "Stop listening" : "Click to speak architecture"}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-sky-400" />
                    <span>Voice Input</span>
                  </>
                )}
              </button>

              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText("")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                  title="Clear input"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Synthesize Submit Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isParsing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3" />
              <span>{isParsing ? "Synthesizing..." : "Synthesize Graph"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Instant Demo Presets */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Interactive Hackathon Presets</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {/* Preset 1: E-Commerce */}
          <button
            onClick={() => handleSelectPreset("ecommerce")}
            className={`flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all ${
              activePreset === "ecommerce"
                ? "bg-sky-950/40 border-sky-500/60 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50"
            }`}
          >
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 mt-0.5">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 truncate">
                  E-Commerce Microservices
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  3 Violations
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                Next.js, Kong Gateway, Auth, FastAPI Orders, PostgreSQL (SPOF) &amp; Sync Worker.
              </p>
            </div>
          </button>

          {/* Preset 2: FinTech */}
          <button
            onClick={() => handleSelectPreset("fintech")}
            className={`flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all ${
              activePreset === "fintech"
                ? "bg-indigo-950/40 border-indigo-500/60 shadow-[0_0_15px_rgba(129,140,248,0.15)]"
                : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50"
            }`}
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 truncate">
                  FinTech Payment Gateway
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Cycle Risk
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                Mobile App, Envoy Proxy, Golang Payment &amp; Python Fraud Detection circular loop.
              </p>
            </div>
          </button>

          {/* Preset 3: IoT Telemetry */}
          <button
            onClick={() => handleSelectPreset("iot")}
            className={`flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all ${
              activePreset === "iot"
                ? "bg-purple-950/40 border-purple-500/60 shadow-[0_0_15px_rgba(192,132,252,0.15)]"
                : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50"
            }`}
          >
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
              <Radio className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 truncate">
                  IoT Realtime Ingestion
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Unbuffered
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                Sensor Fleet, EMQX Gateway directly bottlenecking into raw Timescale DB.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
