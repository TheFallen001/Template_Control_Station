"use client";

import { useState, useRef } from "react";
import { motion, useDragControls } from "framer-motion";
import { MapPin, Trash2, Navigation } from "lucide-react";
import { useRosPublisher } from "@/lib/useRosPublisher";

interface Waypoint {
    id: string;
    x: number;
    y: number;
    label: string;
}

interface GoalPoseMsg {
    header: { frame_id: string };
    pose: { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number } };
}

let waypointCounter = 1;

export default function NavigationController() {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const dragControls = useDragControls();
    const mapRef = useRef<HTMLDivElement>(null);

    const publish = useRosPublisher<GoalPoseMsg>("/goal_pose", { messageType: "geometry_msgs/PoseStamped" });

    /** Convert click position on the mini-map into real-world coordinates (±5m range) */
    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = mapRef.current!.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        const relY = (e.clientY - rect.top) / rect.height;
        const wx = +(relX * 10 - 5).toFixed(2);
        const wy = +((1 - relY) * 10 - 5).toFixed(2);
        const wp: Waypoint = { id: crypto.randomUUID?.() ?? String(Date.now()), x: wx, y: wy, label: `WP${waypointCounter++}` };
        setWaypoints((prev) => [...prev, wp]);
    };

    const sendGoal = (wp: Waypoint) => {
        setActiveId(wp.id);
        publish({
            header: { frame_id: "map" },
            pose: {
                position: { x: wp.x, y: wp.y, z: 0 },
                orientation: { x: 0, y: 0, z: 0, w: 1 },
            },
        });
        setTimeout(() => setActiveId(null), 2000);
    };

    const removeWaypoint = (id: string) => setWaypoints((prev) => prev.filter((w) => w.id !== id));

    return (
        <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            className="glass-card"
            style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", cursor: "default", userSelect: "none" }}
        >
            {/* Drag handle header */}
            <div
                onPointerDown={(e) => dragControls.start(e)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "grab" }}
            >
                <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                    ⠿ Navigation
                </p>
                <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>drag to move</span>
            </div>

            {/* Mini map / click area */}
            <div
                ref={mapRef}
                onClick={handleMapClick}
                style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1",
                    background: "rgba(8,12,20,0.7)",
                    border: "1px solid var(--color-glass-border)",
                    borderRadius: 10,
                    cursor: "crosshair",
                    overflow: "hidden",
                }}
            >
                {/* Grid lines */}
                <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.15 }}>
                    {[0.25, 0.5, 0.75].map((v) => (
                        <g key={v}>
                            <line x1={`${v * 100}%`} y1="0" x2={`${v * 100}%`} y2="100%" stroke="#3b82f6" strokeWidth={0.5} />
                            <line x1="0" y1={`${v * 100}%`} x2="100%" y2={`${v * 100}%`} stroke="#3b82f6" strokeWidth={0.5} />
                        </g>
                    ))}
                    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#3b82f6" strokeWidth={1} />
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#3b82f6" strokeWidth={1} />
                </svg>

                {/* Robot origin */}
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 2 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-blue-glow)", boxShadow: "0 0 10px var(--color-blue-glow)" }} />
                </div>

                {/* Waypoint pins */}
                {waypoints.map((wp) => {
                    const left = `${((wp.x + 5) / 10) * 100}%`;
                    const top = `${((1 - (wp.y + 5) / 10)) * 100}%`;
                    return (
                        <motion.div
                            key={wp.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{ position: "absolute", transform: "translate(-50%,-100%)", left, top, zIndex: 3 }}
                        >
                            <MapPin
                                size={16}
                                fill={activeId === wp.id ? "#34d399" : "#f59e0b"}
                                color={activeId === wp.id ? "#34d399" : "#f59e0b"}
                                style={{ filter: `drop-shadow(0 0 4px ${activeId === wp.id ? "#34d399" : "#f59e0b"})` }}
                            />
                        </motion.div>
                    );
                })}

                <p style={{ position: "absolute", bottom: 6, left: 8, fontSize: "0.55rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
                    CLICK TO PLACE WAYPOINT
                </p>
            </div>

            {/* Waypoint list */}
            {waypoints.length === 0 ? (
                <p style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", textAlign: "center" }}>No waypoints placed</p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 140, overflowY: "auto" }}>
                    {waypoints.map((wp) => (
                        <div
                            key={wp.id}
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: activeId === wp.id ? "var(--color-emerald-muted)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${activeId === wp.id ? "var(--color-emerald-primary)" : "var(--color-glass-border)"}`,
                                borderRadius: 8, padding: "5px 10px",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>
                                {wp.label}&nbsp;
                                <span style={{ color: "var(--color-text-muted)" }}>({wp.x}, {wp.y})</span>
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => sendGoal(wp)} title="Send goal" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-blue-glow)", padding: 2 }}>
                                    <Navigation size={13} />
                                </button>
                                <button onClick={() => removeWaypoint(wp.id)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-ruby-primary)", padding: 2 }}>
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
