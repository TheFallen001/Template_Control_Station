"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRosPublisher } from "@/lib/useRosPublisher";
import { useRos } from "@/lib/RosContext";

interface TwistMsg {
    linear: { x: number; y: number; z: number };
    angular: { x: number; y: number; z: number };
}

const ZERO_TWIST: TwistMsg = {
    linear: { x: 0, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0 },
};

export default function EmergencyConsole() {
    const { status } = useRos();
    const [triggered, setTriggered] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const publish = useRosPublisher<TwistMsg>("/diff_drive_controller/cmd_vel", { messageType: "geometry_msgs/TwistStamped" });

    const estop = useCallback(() => {
        // Send three rapid zero-velocity commands for redundancy
        for (let i = 0; i < 3; i++) {
            setTimeout(() => publish(ZERO_TWIST), i * 40);
        }
        setTriggered(true);
        const ts = new Date().toLocaleTimeString();
        setLog((prev) => [`${ts} — E-STOP issued`, ...prev].slice(0, 6));
        setTimeout(() => setTriggered(false), 2500);
    }, [publish]);

    const isDisabled = status !== "connected";

    return (
        <div className="glass-card" style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            border: triggered ? "1px solid var(--color-ruby-glow)" : "1px solid var(--color-glass-border)",
            boxShadow: triggered ? "0 0 32px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.12)" : undefined,
            transition: "border 0.2s ease, box-shadow 0.3s ease",
        }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                    Emergency Console
                </p>
                <span style={{
                    fontSize: "0.55rem", letterSpacing: "0.15em", textTransform: "uppercase",
                    color: status === "connected" ? "var(--color-emerald-primary)" : "var(--color-ruby-primary)",
                    padding: "2px 8px",
                    border: `1px solid ${status === "connected" ? "var(--color-emerald-primary)" : "var(--color-ruby-primary)"}`,
                    borderRadius: 20,
                }}>
                    {status}
                </span>
            </div>

            {/* E-Stop button */}
            <div style={{ display: "flex", justifyContent: "center" }}>
                <motion.button
                    onClick={estop}
                    disabled={isDisabled}
                    whileHover={!isDisabled ? { scale: 1.04 } : {}}
                    whileTap={!isDisabled ? { scale: 0.95 } : {}}
                    animate={triggered ? { boxShadow: ["0 0 24px #dc2626", "0 0 60px #ef4444", "0 0 24px #dc2626"] } : {}}
                    transition={triggered ? { duration: 0.5, repeat: 4 } : {}}
                    style={{
                        width: 110, height: 110,
                        borderRadius: "50%",
                        background: triggered
                            ? "radial-gradient(circle, #7f1d1d, #dc2626)"
                            : isDisabled
                                ? "radial-gradient(circle, #1c1c1c, #2a2a2a)"
                                : "radial-gradient(circle, #991b1b, #dc2626, #b91c1c)",
                        border: `3px solid ${triggered ? "#ef4444" : isDisabled ? "#3f3f3f" : "#991b1b"}`,
                        boxShadow: triggered
                            ? "0 0 40px rgba(239,68,68,0.7), inset 0 2px 4px rgba(255,255,255,0.15)"
                            : isDisabled
                                ? "none"
                                : "0 0 20px rgba(220,38,38,0.4), inset 0 2px 4px rgba(255,255,255,0.1)",
                        color: isDisabled ? "#555" : "#fff",
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        transition: "background 0.2s, border 0.2s, box-shadow 0.2s",
                        fontFamily: "var(--font-sans)",
                    }}
                >
                    {triggered ? "STOPPED" : "E-STOP"}
                </motion.button>
            </div>

            {/* Instruction */}
            <p style={{ fontSize: "0.62rem", textAlign: "center", color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
                {isDisabled
                    ? "Connect to ROS before activating"
                    : "Publishes zero-velocity to /diff_drive_controller/cmd_vel"}
            </p>

            {/* Activity log */}
            <AnimatePresence>
                {log.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        style={{
                            borderTop: "1px solid var(--color-glass-border)",
                            paddingTop: "0.75rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                        }}
                    >
                        {log.map((entry, i) => (
                            <motion.p
                                key={i}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1 - i * 0.15, x: 0 }}
                                style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "var(--color-ruby-primary)" }}
                            >
                                {entry}
                            </motion.p>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
