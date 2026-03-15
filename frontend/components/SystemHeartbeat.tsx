"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Battery, Cpu, Wifi } from "lucide-react";
import { useRosTopic } from "@/lib/useRosTopic";

interface DiagnosticStatus {
    level: number; // 0: OK, 1: WARN, 2: ERROR, 3: STALE
    name: string;
    message: string;
    hardware_id: string;
    values: { key: string; value: string }[];
}

interface DiagnosticArray {
    header: { stamp: { sec: number; nanosec: number }; frame_id: string };
    status: DiagnosticStatus[];
}

export default function SystemHeartbeat() {
    const [diagnostics, setDiagnostics] = useState<DiagnosticStatus[]>([]);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

    useRosTopic<DiagnosticArray>("/diagnostics", { messageType: "diagnostic_msgs/DiagnosticArray", throttleMs: 500 }, (msg) => {
        setDiagnostics(msg.status);

        // Try to extract battery level
        const batteryStatus = msg.status.find(s => s.name.toLowerCase().includes("battery"));
        if (batteryStatus) {
            const chargeVal = batteryStatus.values.find(v => v.key.toLowerCase().includes("charge") || v.key.toLowerCase().includes("percentage"));
            if (chargeVal) {
                setBatteryLevel(parseFloat(chargeVal.value));
            }
        }
    });

    // Compute overall system health
    const hasError = diagnostics.some(d => d.level === 2);
    const hasWarn = diagnostics.some(d => d.level === 1);

    const bgColor = hasError ? "var(--color-ruby-muted)" : hasWarn ? "var(--color-amber-muted)" : "var(--color-emerald-muted)";
    const iconColor = hasError ? "var(--color-ruby-glow)" : hasWarn ? "var(--color-amber-glow)" : "var(--color-emerald-glow)";
    const statusText = hasError ? "CRITICAL FAULT" : hasWarn ? "SYSTEM WARNING" : "SYSTEM NOMINAL";

    return (
        <div className="glass-card" style={{
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* Background grid */}
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.1, zIndex: 0 }}>
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" color="var(--color-text-muted)" />
            </svg>

            <div style={{ zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "2rem" }}>
                    <Activity size={18} color="var(--color-blue-glow)" />
                    <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                        System Diagnostics
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    {/* Pulsing Heartbeat Circle */}
                    <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.2, 0.4, 0.2]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                                position: "absolute", inset: "-20%", borderRadius: "50%",
                                background: bgColor
                            }}
                        />
                        <div style={{
                            width: 60, height: 60, borderRadius: "50%",
                            background: "rgba(255,255,255,0.05)",
                            border: `1px solid ${iconColor}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: `0 0 16px ${bgColor}, inset 0 0 12px ${bgColor}`
                        }}>
                            <Cpu size={28} color={iconColor} />
                        </div>
                    </div>

                    <div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "0.05em" }}>
                            {statusText}
                        </h2>
                        <p style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: 4 }}>
                            All vital sub-systems online and responding.
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {/* Battery Card */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-glass-border)", borderRadius: 12, padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>Internal Power</span>
                        <Battery size={14} color="var(--color-emerald-glow)" />
                    </div>
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-emerald-primary)" }}>
                        {batteryLevel !== null ? `${batteryLevel.toFixed(1)}%` : "--%"}
                    </p>
                </div>

                {/* Network Card */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--color-glass-border)", borderRadius: 12, padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-text-muted)" }}>Comm. Link</span>
                        <Wifi size={14} color="var(--color-blue-glow)" />
                    </div>
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-blue-primary)" }}>
                        OK
                    </p>
                </div>
            </div>

            {/* Active faults list (if any) */}
            {diagnostics.filter(d => d.level > 0).length > 0 && (
                <div style={{ zIndex: 1, marginTop: "1rem", maxHeight: 100, overflowY: "auto", borderTop: "1px dashed var(--color-glass-border)", paddingTop: "1rem" }}>
                    <p style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", marginBottom: 8, letterSpacing: "0.1em" }}>ACTIVE DETECTIONS</p>
                    {diagnostics.filter(d => d.level > 0).map((d, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.7rem", color: d.level === 2 ? "var(--color-ruby-primary)" : "var(--color-amber-primary)", marginBottom: 4 }}>
                            <span>[{d.name}]</span>
                            <span>{d.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
