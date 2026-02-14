"use client"

import React, { useEffect, useRef, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

// Initialize modules
if (typeof window !== 'undefined' && typeof Highcharts === 'object') {
    // Use require to handle potential ESM/CJS interop issues in Turbopack
    // and avoid "default is not a function" errors.
    const treemap = require('highcharts/modules/treemap');
    const heatmap = require('highcharts/modules/heatmap');
    
    if (typeof treemap === 'function') {
        treemap(Highcharts);
    } else if (treemap && typeof treemap.default === 'function') {
        treemap.default(Highcharts);
    }
    
    if (typeof heatmap === 'function') {
        heatmap(Highcharts);
    } else if (heatmap && typeof heatmap.default === 'function') {
        heatmap.default(Highcharts);
    }
}

interface MarketHeatmapProps {
    index: string
}

interface HeatmapPoint {
    id?: string
    name: string
    fullName?: string
    parent?: string
    value?: number
    colorValue?: number
    level?: number
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ index }) => {
    const [data, setData] = useState<HeatmapPoint[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const chartComponentRef = useRef<HighchartsReact.RefObject>(null)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                const response = await fetch(`http://localhost:8000/api/search/heatmap?index=${encodeURIComponent(index)}`)
                const json = await response.json()
                setData(json)
            } catch (error) {
                console.error("Failed to fetch heatmap data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [index])

    const options: Highcharts.Options = {
        accessibility: {
            enabled: false
        },
        chart: {
            backgroundColor: 'transparent',
            height: 600,
            style: {
                fontFamily: 'JetBrains Mono, monospace'
            }
        },
        title: {
            text: undefined
        },
        credits: {
            enabled: false
        },
        colorAxis: {
            dataClasses: [
                { from: -100, to: -3, color: '#ef4444', name: '< -3%' },
                { from: -3, to: -1.5, color: '#f87171', name: '-3% to -1.5%' },
                { from: -1.5, to: -0.5, color: '#fca5a5', name: '-1.5% to -0.5%' },
                { from: -0.5, to: 0.5, color: '#444444', name: 'Flat' },
                { from: 0.5, to: 1.5, color: '#86efac', name: '0.5% to 1.5%' },
                { from: 1.5, to: 3, color: '#4ade80', name: '1.5% to 3%' },
                { from: 3, to: 100, color: '#22c55e', name: '> 3%' }
            ]
        },
        series: [{
            type: 'treemap',
            layoutAlgorithm: 'squarified',
            allowTraversingTree: true,
            animationLimit: 1000,
            dataLabels: {
                enabled: true,
                format: '{point.name}<br/>{point.colorValue:.2f}%',
                style: {
                    fontSize: '9px',
                    fontWeight: '900',
                    textOutline: 'none',
                    color: '#ffffff'
                }
            },
            levelIsConstant: false,
            levels: [{
                level: 1,
                dataLabels: {
                    enabled: true,
                    align: 'left',
                    verticalAlign: 'top',
                    style: {
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textOutline: 'none'
                    }
                },
                borderWidth: 3,
                borderColor: '#09090b'
            }, {
                level: 2,
                borderWidth: 1,
                borderColor: '#18181b'
            }],
            data: data
        }],
        tooltip: {
            backgroundColor: '#09090b',
            style: {
                color: '#ffffff',
                fontSize: '10px'
            },
            pointFormat: '<b>{point.fullName}</b><br/>Market Cap: ${point.value:,.0f}<br/>Change: {point.colorValue:.2f}%'
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] w-full gap-4">
                <div className="grid grid-cols-4 gap-2 w-64 opacity-20">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="bg-muted aspect-square rounded-sm animate-pulse" />
                    ))}
                </div>
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest animate-pulse">
                    Aggregating Market Tree...
                </span>
            </div>
        )
    }

    return (
        <div className="w-full">
            <HighchartsReact
                highcharts={Highcharts}
                options={options}
                ref={chartComponentRef}
            />
        </div>
    )
}
