"use client"

import { useEffect, useRef, useState } from "react"
import { 
    createOptionsChart, 
    ColorType, 
    ICustomSeriesPaneView, 
    ICustomSeriesPaneRenderer, 
    PaneRendererCustomData, 
    PriceToCoordinateConverter,
    CustomSeriesWhitespaceData,
    customSeriesDefaultOptions,
    CustomSeriesOptions
} from "lightweight-charts"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ScatterData {
  momentum?: number;
  f_score?: number;
  symbol: string;
  [key: string]: unknown;
}

interface ScatterPoint {
    time: number
    value: number
    isFocus: boolean
}

// --- SCATTER SERIES PLUGIN ---

class ScatterRenderer implements ICustomSeriesPaneRenderer {
    private _data: PaneRendererCustomData<number, ScatterPoint> | null = null;

    update(data: PaneRendererCustomData<number, ScatterPoint>): void {
        this._data = data;
    }

    draw(target: { useMediaCoordinateSpace: (cb: (scope: { context: CanvasRenderingContext2D }) => void) => void }, priceConverter: PriceToCoordinateConverter): void {
        if (!this._data) return;

        target.useMediaCoordinateSpace((scope) => {
            const ctx = scope.context;
            const { bars, visibleRange } = this._data!;
            if (!visibleRange) return;

            for (let i = visibleRange.from; i < visibleRange.to; i++) {
                const bar = bars[i];
                const y = priceConverter(bar.originalData.value);
                const x = bar.x;
                if (y === null) continue;

                ctx.beginPath();
                const isFocus = bar.originalData.isFocus;
                const radius = isFocus ? 5 : 2;
                
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = isFocus ? "#0ea5e9" : "rgba(148, 163, 184, 0.3)";
                ctx.fill();
                
                if (isFocus) {
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        });
    }
}

class ScatterSeries implements ICustomSeriesPaneView<number, ScatterPoint> {
    private _renderer = new ScatterRenderer();

    renderer() { return this._renderer; }

    update(data: PaneRendererCustomData<number, ScatterPoint>) {
        this._renderer.update(data);
    }

    priceValueBuilder(data: ScatterPoint) {
        return [data.value];
    }

    isWhitespace(data: ScatterPoint | CustomSeriesWhitespaceData<number>): data is CustomSeriesWhitespaceData<number> {
        return !('value' in data);
    }

    defaultOptions(): CustomSeriesOptions {
        return {
            ...customSeriesDefaultOptions,
            color: "#0ea5e9"
        };
    }

    destroy() {}
}

// --- COMPONENT ---

export function RankScatter({ data, focusSymbol }: { data: ScatterData[], focusSymbol: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
      const timer = setTimeout(() => setMounted(true), 0)
      return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!mounted || !chartContainerRef.current || !data || data.length === 0) return

    const chart = createOptionsChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "var(--font-jetbrains-mono)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.05)" },
        horzLines: { color: "rgba(148, 163, 184, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    })

    const customSeries = chart.addCustomSeries(new ScatterSeries(), {})

    // Process data to ensure strictly increasing time (momentum) values
    const rawPoints = data
        .filter(d => typeof d.momentum === 'number' && typeof d.f_score === 'number')
        .map(d => ({
            time: d.momentum as number,
            value: d.f_score as number,
            isFocus: d.symbol === focusSymbol
        }))
        .sort((a, b) => a.time - b.time)

    // Uniqueness fix: Add tiny epsilon to duplicates to satisfy lightweight-charts requirements
    const scatterPoints: ScatterPoint[] = []
    let lastTime = -Infinity
    const epsilon = 0.00001

    rawPoints.forEach(p => {
        let adjustedTime = p.time
        if (adjustedTime <= lastTime) {
            adjustedTime = lastTime + epsilon
        }
        scatterPoints.push({
            ...p,
            time: adjustedTime
        })
        lastTime = adjustedTime
    })

    customSeries.setData(scatterPoints)
    chart.timeScale().fitContent()

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [mounted, data, focusSymbol])

  return (
    <Card className="h-full border-border/50 bg-card/20 backdrop-blur-sm flex flex-col">
        <CardHeader className="py-2 px-3 border-b border-border/50 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Quality vs Momentum</CardTitle>
            <Badge variant="outline" className="h-4 text-[8px] border-primary/30 text-primary bg-primary/5 font-mono uppercase tracking-tighter">Alpha Map</Badge>
        </CardHeader>
        <CardContent className="flex-1 p-0 min-h-0 relative">
            {!data || data.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground uppercase tracking-widest font-mono italic">
                    Mapping Distribution...
                </div>
            ) : (
                <div ref={chartContainerRef} className="w-full h-full" />
            )}
        </CardContent>
    </Card>
  )
}
