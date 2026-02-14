"use client"

import React from "react"

interface CodeEditorProps {
  value: string
  onChange: (val: string) => void
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  return (
    <div className="relative h-full font-mono text-sm bg-[#09090b] rounded-xl overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-8 bg-muted/30 flex items-center px-4 border-b border-border/50 text-[10px] uppercase font-black tracking-widest text-muted-foreground select-none z-10">
            algorithms.py // Strategy Logic
        </div>
        <textarea 
            className="w-full h-full p-4 pt-12 bg-transparent text-chart-3 resize-none focus:outline-none custom-scrollbar leading-relaxed selection:bg-primary/30"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
        />
        {/* Subtle Line Numbers Placeholder */}
        <div className="absolute top-12 left-0 w-8 text-right pr-2 text-muted-foreground/20 select-none pointer-events-none text-[10px] leading-relaxed">
            {Array.from({length: 40}).map((_, i) => (
                <div key={i}>{i+1}</div>
            ))}
        </div>
    </div>
  )
}
