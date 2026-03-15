"use client";

import { useState } from "react";
import { useRosTopic } from "@/lib/useRosTopic";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OdomMsg {
    twist: { twist: { linear: { x: number; y: number; z: number }; angular: { x: number; y: number; z: number } } };
}
interface ImuMsg {
    orientation: { x: number; y: number; z: number; w: number };
    angular_velocity: { x: number; y: number; z: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }

/** Convert quaternion to Euler angles (degrees) */
function quatToEuler(q: { x: number; y: number; z: number; w: number }) {
    const { x, y, z, w } = q;
    const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * (180 / Math.PI);
    const pitch = Math.asin(clamp(2 * (w * y - z * x), -1, 1)) * (180 / Math.PI);
    const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * (180 / Math.PI);
    return { roll, pitch, yaw };
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
function ArcGauge({ label, value, min, max, unit, color }: {
    label: string; value: number; min: number; max: number; unit: string; color: string;
}) {
    const pct = clamp((value - min) / (max - min), 0, 1);
    const R = 36; const cx = 50; const cy = 54;
    const startAngle = -210; const sweepAngle = 240;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const arcPath = (pct: number) => {
        const endAngle = startAngle + sweepAngle * pct;
        const x1 = cx + R * Math.cos(toRad(startAngle));
        const y1 = cy + R * Math.sin(toRad(startAngle));
        const x2 = cx + R * Math.cos(toRad(endAngle));
        const y2 = cy + R * Math.sin(toRad(endAngle));
        const large = sweepAngle * pct > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <svg width="100" height="72" viewBox="0 0 100 72">
                {/* Track */}
                <path d={arcPath(1)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} strokeLinecap="round" />
                {/* Value arc */}
                <path d={arcPath(pct)} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "all 0.2s ease" }} />
                {/* Value text */}
                <text x="50" y="52" textAnchor="middle" fill="var(--color-text-primary)"
                    fontSize="13" fontWeight="700" fontFamily="var(--font-mono)">
                    {value.toFixed(2)}
                </text>
            </svg>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: -4 }}>
                {label} <span style={{ color }}>{unit}</span>
            </p>
        </div>
    );
}

// ── IMU Cube ──────────────────────────────────────────────────────────────────
function ImuCube({ roll, pitch, yaw }: { roll: number; pitch: number; yaw: number }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
                width: 52, height: 52,
                position: "relative",
                transformStyle: "preserve-3d",
                transform: `rotateX(${-pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg)`,
                transition: "transform 0.15s ease",
            }}>
                {/* 6 faces */}
                {[
                    { bg: "rgba(37,99,235,0.55)", transform: "translateZ(26px)" },
                    { bg: "rgba(37,99,235,0.3)", transform: "rotateY(180deg) translateZ(26px)" },
                    { bg: "rgba(37,99,235,0.4)", transform: "rotateY(-90deg) translateZ(26px)" },
                    { bg: "rgba(37,99,235,0.4)", transform: "rotateY(90deg) translateZ(26px)" },
                    { bg: "rgba(16,185,129,0.5)", transform: "rotateX(90deg) translateZ(26px)" },
                    { bg: "rgba(220,38,38,0.45)", transform: "rotateX(-90deg) translateZ(26px)" },
                ].map((face, i) => (
                    <div key={i} style={{
                        position: "absolute", width: 52, height: 52,
                        background: face.bg,
                        border: "1px solid rgba(255,255,255,0.12)",
                        backdropFilter: "blur(4px)",
                        transform: face.transform,
                        backfaceVisibility: "hidden",
                    }} />
                ))}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                <span>R <span style={{ color: "var(--color-blue-glow)" }}>{roll.toFixed(1)}°</span></span>
                <span>P <span style={{ color: "var(--color-emerald-glow)" }}>{pitch.toFixed(1)}°</span></span>
                <span>Y <span style={{ color: "var(--color-amber-glow)" }}>{yaw.toFixed(1)}°</span></span>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TelemetryDashboard() {
    const [linearX, setLinearX] = useState(0);
    const [angularZ, setAngularZ] = useState(0);
    const [euler, setEuler] = useState({ roll: 0, pitch: 0, yaw: 0 });

    useRosTopic<OdomMsg>("/diff_drive_controller/odom", { messageType: "nav_msgs/Odometry", throttleMs: 80 }, (msg) => {
        setLinearX(msg.twist.twist.linear.x);
        setAngularZ(msg.twist.twist.angular.z);
    });

    // useRosTopic<ImuMsg>("/imu", { messageType: "sensor_msgs/Imu", throttleMs: 80 }, (msg) => {
    //     setEuler(quatToEuler(msg.orientation));
    // });

    return (
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Telemetry</p>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-emerald-primary)", boxShadow: "0 0 6px var(--color-emerald-primary)", display: "inline-block" }} className="glow-pulse" />
            </div>

            {/* Velocity gauges */}
            <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "0.5rem" }}>
                <ArcGauge label="Linear" value={linearX} min={-2} max={2} unit="m/s" color="var(--color-blue-glow)" />
                <ArcGauge label="Angular" value={angularZ} min={-3} max={3} unit="r/s" color="var(--color-amber-glow)" />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--color-glass-border)" }} />

            {/* IMU */}
            {/* <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 4 }}>IMU Orientation</p>
                <ImuCube {...euler} />
            </div> */}
        </div>
    );
}
