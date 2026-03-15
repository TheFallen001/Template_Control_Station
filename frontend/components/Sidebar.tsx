"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, Cpu, Map, Settings } from "lucide-react";

export type Section = "overview" | "sensors" | "mission_control";

interface SidebarProps {
    activeSection: Section;
    onSelect: (section: Section) => void;
}

export default function Sidebar({ activeSection, onSelect }: SidebarProps) {
    const items = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "sensors", label: "Sensors", icon: Cpu },
        { id: "mission_control", label: "Mission Control", icon: Map },
    ];

    return (
        <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="glass-card"
            style={{
                display: "flex",
                flexDirection: "column",
                width: "80px",
                padding: "1.5rem 0",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "0 16px 16px 0",
                borderLeft: "none",
                zIndex: 50,
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem", alignItems: "center" }}>
                {/* Logo / Robot icon */}
                <div style={{
                    width: 40, height: 40,
                    borderRadius: "12px",
                    background: "rgba(37,99,235,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid rgba(59,130,246,0.3)",
                    boxShadow: "0 0 12px rgba(59,130,246,0.2)"
                }}>
                    <Settings size={20} color="var(--color-blue-glow)" />
                </div>

                {/* Nav Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "2rem" }}>
                    {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => onSelect(item.id as Section)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    position: "relative",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 48,
                                    height: 48,
                                    borderRadius: "12px",
                                    color: isActive ? "var(--color-blue-glow)" : "var(--color-text-muted)",
                                    transition: "color 0.2s ease"
                                }}
                                title={item.label}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: "rgba(37,99,235,0.1)",
                                            border: "1px solid rgba(59,130,246,0.3)",
                                            borderRadius: "12px",
                                            boxShadow: "0 0 12px rgba(59,130,246,0.2)"
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 26 }}
                                    />
                                )}
                                <Icon size={22} style={{ zIndex: 1 }} />
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom spacer or additional options could go here */}
            <div />
        </motion.div>
    );
}
