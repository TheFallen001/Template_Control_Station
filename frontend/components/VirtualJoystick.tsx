"use client";

import { useRef, useCallback } from "react";
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";
import { useRosPublisher } from "@/lib/useRosPublisher";
import { useRos } from "@/lib/RosContext";

interface TwistMsg {
    linear: { x: number; y: number; z: number };
    angular: { x: number; y: number; z: number };
}

// Joystick geometry
const BASE_R = 64;   // radius of the outer ring (px)
const KNOB_R = 22;   // radius of the draggable thumb (px)
const MAX_DRAG = BASE_R - KNOB_R;

// Velocity scaling
const MAX_LINEAR = 0.6;  // m/s
const MAX_ANGULAR = 1.2;  // rad/s

// Elastic spring — high stiffness + low damping = bouncy snap-back
const SPRING = { stiffness: 380, damping: 22, mass: 0.8 };

export default function VirtualJoystick() {
    const { status } = useRos();
    const publish = useRosPublisher<TwistMsg>("/diff_drive_controller/cmd_vel", {
        messageType: "geometry_msgs/TwistStamped",
    });

    // Raw motion values (set directly on pointer move)
    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);

    // Spring-animated values — give the thumb elastic physics
    const springX = useSpring(rawX, SPRING);
    const springY = useSpring(rawY, SPRING);

    // Visual opacity ring tint based on distance from center
    const dist = useTransform<number, number>([springX, springY], ([x, y]) =>
        Math.min(Math.sqrt((x as number) ** 2 + (y as number) ** 2) / MAX_DRAG, 1)
    );

    const isDragging = useRef(false);
    const publishInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const startPublishing = useCallback(() => {
        if (publishInterval.current) return;
        publishInterval.current = setInterval(() => {
            const x = springX.get();
            const y = springY.get();
            const linear = -(y / MAX_DRAG) * MAX_LINEAR;   // up = forward
            const angular = -(x / MAX_DRAG) * MAX_ANGULAR;  // left = positive yaw
            publish({
                linear: { x: linear, y: 0, z: 0 },
                angular: { x: 0, y: 0, z: angular },
            });
        }, 50); // 20 Hz
    }, [springX, springY, publish]);

    const stopPublishing = useCallback(() => {
        if (publishInterval.current) {
            clearInterval(publishInterval.current);
            publishInterval.current = null;
        }
        // Send a final stop
        publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
    }, [publish]);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (status !== "connected") return;
            isDragging.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            startPublishing();
        },
        [status, startPublishing]
    );

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isDragging.current) return;
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let dx = e.clientX - cx;
            let dy = e.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > MAX_DRAG) {
                dx = (dx / dist) * MAX_DRAG;
                dy = (dy / dist) * MAX_DRAG;
            }
            rawX.set(dx);
            rawY.set(dy);
        },
        [rawX, rawY]
    );

    const handlePointerUp = useCallback(() => {
        isDragging.current = false;
        rawX.set(0);
        rawY.set(0);
        stopPublishing();
    }, [rawX, rawY, stopPublishing]);

    const disabled = status !== "connected";

    return (
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            {/* Label */}
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                    Virtual Joystick
                </p>
                <span style={{
                    fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase",
                    color: disabled ? "var(--color-ruby-primary)" : "var(--color-emerald-primary)",
                    padding: "2px 8px",
                    border: `1px solid ${disabled ? "var(--color-ruby-primary)" : "var(--color-emerald-primary)"}`,
                    borderRadius: 20,
                }}>
                    {disabled ? "offline" : "live"}
                </span>
            </div>

            {/* Base ring */}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                    position: "relative",
                    width: BASE_R * 2,
                    height: BASE_R * 2,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.03)",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    boxShadow: "inset 0 0 20px rgba(0,0,0,0.4)",
                    cursor: disabled ? "not-allowed" : "none",
                    touchAction: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: disabled ? 0.4 : 1,
                    transition: "opacity 0.3s ease",
                }}
            >
                {/* Cross-hair grid lines */}
                <svg
                    style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.12 }}
                    width={BASE_R * 2}
                    height={BASE_R * 2}
                >
                    <line x1={BASE_R} y1={4} x2={BASE_R} y2={BASE_R * 2 - 4} stroke="#3b82f6" strokeWidth={1} />
                    <line x1={4} y1={BASE_R} x2={BASE_R * 2 - 4} y2={BASE_R} stroke="#3b82f6" strokeWidth={1} />
                    <circle cx={BASE_R} cy={BASE_R} r={MAX_DRAG} fill="none" stroke="#3b82f6" strokeWidth={0.5} strokeDasharray="3 5" />
                </svg>

                {/* Glow overlay — brightens when dragged */}
                <motion.div
                    style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)",
                        opacity: dist,
                    }}
                />

                {/* Draggable thumb */}
                <motion.div
                    style={{
                        x: springX,
                        y: springY,
                        position: "absolute",
                        width: KNOB_R * 2,
                        height: KNOB_R * 2,
                        borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 35%, #60a5fa, #1d4ed8)",
                        border: "1.5px solid rgba(255,255,255,0.3)",
                        boxShadow: "0 0 16px rgba(59,130,246,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
                        cursor: disabled ? "not-allowed" : "grabbing",
                        pointerEvents: "none", // parent captures pointer events
                    }}
                />
            </div>

            {/* Live velocity readout */}
            <div style={{ display: "flex", gap: "1.5rem" }}>
                {[
                    { label: "FWD", value: useTransform(springY, (y) => (-(y / MAX_DRAG) * MAX_LINEAR).toFixed(2)), unit: "m/s", color: "var(--color-blue-glow)" },
                    { label: "YAW", value: useTransform(springX, (x) => (-(x / MAX_DRAG) * MAX_ANGULAR).toFixed(2)), unit: "r/s", color: "var(--color-amber-glow)" },
                ].map(({ label, value, unit, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                        <motion.p style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color }}>
                            {value}
                        </motion.p>
                        <p style={{ fontSize: "0.55rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                            {label} <span style={{ color }}>{unit}</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
