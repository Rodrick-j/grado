"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, HeartPulse, Droplets } from "lucide-react";

export function MonitorVitalPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hr, setHr] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [sys, setSys] = useState(120);
  const [dia, setDia] = useState(80);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let animationFrameId: number;
    let x = 0;
    const speed = 2.5;
    const yOffset = canvas.height / 2;

    // ECG wave data points
    const ecgPattern = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      -2, -4, -2, 0, 0, 0, // P wave
      0, 0, 5, -35, 45, -15, 0, 0, // QRS complex
      0, 0, 0, 0, 0, 0,
      -6, -10, -6, 0, 0, 0, 0, 0, 0, 0, // T wave
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    let patternIndex = 0;
    let lastY = yOffset;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00E676";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#00E676";
    ctx.lineJoin = "round";

    const draw = () => {
      const currentY = yOffset + (ecgPattern[patternIndex] || 0) * (canvas.height / 150);
      
      // Clear a small vertical rectangle ahead of the current x position to create the moving gap effect
      ctx.clearRect(x, 0, 20, canvas.height);

      ctx.beginPath();
      ctx.moveTo(x === 0 ? 0 : x - speed, x === 0 ? currentY : lastY);
      ctx.lineTo(x, currentY);
      ctx.stroke();

      lastY = currentY;
      x += speed;
      
      // We only advance pattern periodically to stretch it
      if (Math.random() > 0.5) {
         patternIndex = (patternIndex + 1) % ecgPattern.length;
      } else {
         patternIndex = (patternIndex + 0.5) % ecgPattern.length;
         patternIndex = Math.floor(patternIndex);
      }
      
      if (x > canvas.width) {
        x = 0;
        patternIndex = 0;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHr(prev => prev + Math.floor(Math.random() * 3) - 1);
      if (Math.random() > 0.7) setSpo2(prev => Math.min(100, Math.max(90, prev + Math.floor(Math.random() * 3) - 1)));
      if (Math.random() > 0.8) {
        setSys(prev => prev + Math.floor(Math.random() * 5) - 2);
        setDia(prev => prev + Math.floor(Math.random() * 3) - 1);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-black text-white p-4 font-mono overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
        <h1 className="text-2xl font-bold tracking-widest text-gray-300">CAMA 102 - MONITOR UCI</h1>
        <div className="flex space-x-4 text-sm">
          <span className="text-gray-400">ID: 883921</span>
          <span className="text-gray-400">PACIENTE: MASCULINO, 45A</span>
        </div>
      </div>
      
      <div className="flex flex-1 gap-4">
        <div className="flex-1 flex flex-col gap-4 border-r border-gray-800 pr-4">
          <div className="flex-1 relative bg-[#050505] rounded-lg border border-gray-800 shadow-[0_0_15px_rgba(0,230,118,0.05)] overflow-hidden">
            <div className="absolute top-2 left-2 text-[#00E676] font-bold">ECG II</div>
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
          
          <div className="flex-1 relative bg-[#050505] rounded-lg border border-gray-800 shadow-[0_0_15px_rgba(33,150,243,0.05)] overflow-hidden">
             <div className="absolute top-2 left-2 text-[#2196F3] font-bold">PLETH</div>
             <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
               <path
                 d="M0,50 Q10,50 15,20 T25,80 T35,50 T45,50 T55,20 T65,80 T75,50 T100,50"
                 fill="none"
                 stroke="#2196F3"
                 strokeWidth="1"
                 className="animate-[dash_4s_linear_infinite]"
                 style={{ strokeDasharray: 200, strokeDashoffset: 200, filter: 'drop-shadow(0 0 4px #2196F3)' }}
               />
               <style>{`
                 @keyframes dash {
                   to { stroke-dashoffset: 0; }
                 }
               `}</style>
             </svg>
          </div>
        </div>

        <div className="w-72 flex flex-col gap-4">
          <div className="bg-[#050505] border border-[#00E676]/30 p-4 rounded-lg shadow-[0_0_20px_rgba(0,230,118,0.15)] flex flex-col relative">
            <div className="flex items-center gap-2 text-[#00E676] mb-2">
              <HeartPulse className="animate-pulse" />
              <span className="font-bold">FC</span>
            </div>
            <div className="flex items-baseline justify-end">
              <span className="text-6xl font-bold text-[#00E676] animate-pulse">{hr}</span>
              <span className="text-xl text-[#00E676]/70 ml-2">bpm</span>
            </div>
          </div>

          <div className="bg-[#050505] border border-[#2196F3]/30 p-4 rounded-lg shadow-[0_0_20px_rgba(33,150,243,0.15)] flex flex-col relative">
            <div className="flex items-center gap-2 text-[#2196F3] mb-2">
              <Activity />
              <span className="font-bold">SpO2</span>
            </div>
            <div className="flex items-baseline justify-end">
              <span className="text-6xl font-bold text-[#2196F3]">{spo2}</span>
              <span className="text-xl text-[#2196F3]/70 ml-2">%</span>
            </div>
          </div>

          <div className="bg-[#050505] border border-[#F44336]/30 p-4 rounded-lg shadow-[0_0_20px_rgba(244,67,54,0.15)] flex flex-col relative">
            <div className="flex items-center gap-2 text-[#F44336] mb-2">
              <Droplets />
              <span className="font-bold">NIBP</span>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-baseline">
                <span className="text-5xl font-bold text-[#F44336]">{sys}<span className="text-3xl text-[#F44336]/80">/{dia}</span></span>
              </div>
              <span className="text-lg text-[#F44336]/70 mt-1">mmHg</span>
              <span className="text-sm text-[#F44336]/50">( {Math.round((sys + 2 * dia) / 3)} )</span>
            </div>
          </div>
          
          <div className="bg-[#050505] border border-[#FF9800]/30 p-4 rounded-lg shadow-[0_0_20px_rgba(255,152,0,0.15)] flex flex-col relative">
            <div className="flex items-center gap-2 text-[#FF9800] mb-2">
              <Activity className="rotate-90" />
              <span className="font-bold">RESP</span>
            </div>
            <div className="flex items-baseline justify-end">
              <span className="text-5xl font-bold text-[#FF9800]">16</span>
              <span className="text-xl text-[#FF9800]/70 ml-2">rpm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
