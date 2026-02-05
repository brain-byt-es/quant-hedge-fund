"use client"

import { useSettings } from "@/components/providers/settings-provider"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CountryMultiSelect } from "@/components/ui/country-multi-select"
import { 
    IconSettings, 
    IconGlobe, 
    IconLock, 
    IconDeviceDesktop,
    IconRefresh
} from "@tabler/icons-react"
import { toast } from "sonner"

export default function SettingsPage() {
    const { settings, updateSettings } = useSettings()

    return (
        <div className="flex flex-col space-y-8 py-6">
            <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_-3px_var(--primary)]">
                    <IconSettings className="size-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic">Platform Settings</h1>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Global Configuration & Preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* 1. MARKET FILTER SETTINGS */}
                <Card className="lg:col-span-8 border-border/40 bg-card/20 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <IconGlobe className="size-5 text-primary" /> Market Universe Control
                                </CardTitle>
                                <CardDescription>Select which global markets should be visible across the platform.</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                                <Switch 
                                    id="global-filter" 
                                    checked={settings.showOnlyPreferred}
                                    onCheckedChange={(checked) => updateSettings({ showOnlyPreferred: checked })}
                                />
                                <Label htmlFor="global-filter" className="text-[10px] font-black uppercase tracking-widest cursor-pointer">
                                    Strict Filtering
                                </Label>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Jurisdictions</Label>
                            <CountryMultiSelect 
                                defaultValue={settings.preferredMarkets}
                                onChange={(values) => {
                                    if (values.length === 0) {
                                        toast.error("At least one market must be selected")
                                        return
                                    }
                                    updateSettings({ preferredMarkets: values })
                                }}
                                placeholder="Add markets (e.g. United States, Germany...)"
                            />
                        </div>
                        
                        <div className="pt-4 border-t border-border/40 flex justify-between items-center">
                            <p className="text-[10px] text-muted-foreground uppercase font-medium italic">
                                Tip: Disabling &quot;Japan&quot; or &quot;China&quot; will hide those numeric tickers you noticed.
                            </p>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
                                onClick={() => updateSettings({ preferredMarkets: ["United States"] })}
                            >
                                <IconRefresh className="size-3 mr-2" /> Reset to US Only
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. OTHER SETTINGS (PLACEHOLDERS) */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-border/40 bg-card/20 backdrop-blur-sm opacity-60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <IconDeviceDesktop className="size-4" /> Interface
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">Compact Density</Label>
                                <Switch checked />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">Glassmorphism FX</Label>
                                <Switch checked />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 bg-card/20 backdrop-blur-sm opacity-60">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <IconLock className="size-4" /> Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[10px] text-muted-foreground">API Keys and Broker connections are managed in the <Badge variant="outline" className="text-[8px]">Data Hub</Badge></p>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
