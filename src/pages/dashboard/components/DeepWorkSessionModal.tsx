import React, { useState, useEffect, useRef } from "react";
import { X, Play, Pause, Square, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface DeepWorkSessionModalProps {
  onClose: (durationSeconds: number) => void;
  topicTitle: string;
}

export const DeepWorkSessionModal: React.FC<DeepWorkSessionModalProps> = ({ onClose, topicTitle }) => {
  const [sessionState, setSessionState] = useState<"setup" | "running" | "paused" | "finished">("setup");
  const [targetMinutes, setTargetMinutes] = useState<number>(25); // 0 means stopwatch
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tick logic
  useEffect(() => {
    if (sessionState === "running") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Check for completion if using countdown mode
          if (targetMinutes > 0 && next >= targetMinutes * 60) {
            setSessionState("finished");
            if (timerRef.current) clearInterval(timerRef.current);
            // Optionally play a sound here
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionState, targetMinutes]);

  const handleStart = () => {
    setSessionState("running");
  };

  const handlePause = () => {
    setSessionState("paused");
  };

  const handleResume = () => {
    setSessionState("running");
  };

  const handleEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onClose(elapsedSeconds);
  };

  const formatTimeBig = (s: number, tMinutes: number) => {
    // If not stopwatch and we are running/paused, show countdown
    if (tMinutes > 0 && sessionState !== "setup") {
      const remaining = Math.max(0, tMinutes * 60 - s);
      const m = Math.floor(remaining / 60).toString().padStart(2, "0");
      const sec = (remaining % 60).toString().padStart(2, "0");
      return `${m}:${sec}`;
    }
    // Stopwatch or just elapsed time display
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-xl transition-all duration-500">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 w-full">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{topicTitle}</h2>
        <Button variant="ghost" size="icon" onClick={() => onClose(elapsedSeconds)} className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {sessionState === "setup" && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center gap-10"
            >
              <div className="text-center space-y-2">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">Deep Work Session</h1>
                <p className="text-muted-foreground text-lg">Set your focus time or just start tracking.</p>
              </div>

              <div className="flex flex-col items-center gap-6 bg-card p-8 rounded-3xl shadow-elevated border border-border/50 w-full">
                <div className="flex items-center justify-center gap-6">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-14 w-14 rounded-full"
                    onClick={() => setTargetMinutes(Math.max(0, targetMinutes - 5))}
                  >
                    <Minus className="w-6 h-6" />
                  </Button>
                  
                  <div className="text-center w-32 border-b border-border pb-2">
                    <span className="text-5xl font-bold text-foreground">
                      {targetMinutes === 0 ? "∞" : targetMinutes}
                    </span>
                    <span className="text-sm text-muted-foreground block mt-1">
                      {targetMinutes === 0 ? "Stopwatch mode" : "Minutes"}
                    </span>
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-14 w-14 rounded-full"
                    onClick={() => setTargetMinutes(targetMinutes + 5)}
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>
                
                {/* Quick preset buttons */}
                <div className="flex gap-2 mt-2 flex-wrap justify-center">
                  {[15, 25, 45, 60].map(mins => (
                    <Button 
                      key={mins}
                      variant={targetMinutes === mins ? "default" : "secondary"} 
                      size="sm" 
                      onClick={() => setTargetMinutes(mins)}
                      className="rounded-full px-4"
                    >
                      {mins}m
                    </Button>
                  ))}
                  <Button 
                    variant={targetMinutes === 0 ? "default" : "secondary"} 
                    size="sm" 
                    onClick={() => setTargetMinutes(0)}
                    className="rounded-full px-4"
                  >
                    Stopwatch
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleStart} 
                className="h-16 px-12 text-lg rounded-full font-semibold shadow-xl shadow-primary/25 hover:scale-105 transition-transform"
              >
                <Play className="w-5 h-5 mr-3" />
                Start Focus Session
              </Button>
            </motion.div>
          )}

          {(sessionState === "running" || sessionState === "paused" || sessionState === "finished") && (
            <motion.div 
              key="active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center justify-center grow pb-20"
            >
              <div className="text-center relative">
                {/* Progress ring for countdown mode */}
                {targetMinutes > 0 && sessionState !== "finished" && (
                  <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] -rotate-90 pointer-events-none opacity-20">
                    <circle 
                      cx="50%" cy="50%" r="48%" 
                      fill="none" stroke="currentColor" strokeWidth="2" 
                      className="text-primary"
                      strokeDasharray="100 100" // Not real dash array matching, just visual placeholder if want simple
                    />
                  </svg>
                )}
                
                <h1 className={`font-mono font-bold tracking-tighter transition-colors duration-1000 ${
                  sessionState === "finished" 
                    ? "text-primary text-7xl sm:text-[10rem]" 
                    : sessionState === "paused" 
                      ? "text-muted-foreground text-[7rem] sm:text-[14rem]" 
                      : "text-foreground text-[8rem] sm:text-[16rem]"
                }`} style={{ textShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
                  {formatTimeBig(elapsedSeconds, targetMinutes)}
                </h1>

                {sessionState === "finished" && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-medium text-muted-foreground mt-4"
                  >
                    Session Complete!
                  </motion.p>
                )}
                
                {sessionState !== "finished" && targetMinutes === 0 && (
                   <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground text-sm uppercase tracking-widest flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-destructive animate-pulse"></span>
                     Stopwatch Mode
                   </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls Bar (only visible when not in setup) */}
      <AnimatePresence>
        {sessionState !== "setup" && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 p-8 flex justify-center pb-safe"
          >
            <div className="flex items-center gap-6 bg-card/80 backdrop-blur-md border border-border/50 p-2 rounded-full shadow-elevated transition-all group hover:bg-card">
              {sessionState === "running" ? (
                <Button 
                  onClick={handlePause} 
                  variant="secondary" 
                  size="icon" 
                  className="h-16 w-16 rounded-full hover:scale-105 transition-transform"
                >
                  <Pause className="w-6 h-6" />
                </Button>
              ) : sessionState === "paused" ? (
                <Button 
                  onClick={handleResume} 
                  className="h-16 w-16 rounded-full hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                >
                  <Play className="w-6 h-6 ml-1" />
                </Button>
              ) : null}

              {(sessionState === "running" || sessionState === "paused" || sessionState === "finished") && (
                <Button 
                  onClick={handleEnd} 
                  variant="destructive" 
                  className="h-16 px-8 rounded-full text-base font-semibold transition-all hover:scale-105"
                >
                  <Square className="w-5 h-5 mr-2" />
                  {sessionState === "finished" ? "Complete & Save" : "End Session"}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
