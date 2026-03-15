"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRosTopic } from "@/lib/useRosTopic";
import { useRosPublisher } from "@/lib/useRosPublisher";
import { AnimatePresence, motion } from "framer-motion";

// --- ROS Interfaces ---

interface OccupancyGrid {
    info: {
        resolution: number;
        width: number;
        height: number;
        origin: { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number } };
    };
    data: number[]; // -1: Unknown, 0: Free, 100: Occupied
}

interface Pose {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
}

interface Path {
    poses: { pose: Pose }[];
}

interface GoalPoseMsg {
    header: { frame_id: string };
    pose: Pose;
}

// --- MapViewer Component ---

export default function MapViewer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Map State
    const [mapInfo, setMapInfo] = useState<OccupancyGrid["info"] | null>(null);
    const [mapData, setMapData] = useState<number[]>([]);
    const [globalPath, setGlobalPath] = useState<Path | null>(null);
    const [localPath, setLocalPath] = useState<Path | null>(null);

    // Viewport transform (pan/zoom)
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const isDragging = useRef(false);
    const lastPan = useRef({ x: 0, y: 0 });

    // Toast state
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Publishers
    const publishGoal = useRosPublisher<GoalPoseMsg>("/goal_pose", { messageType: "geometry_msgs/PoseStamped" });

    // Toast helper
    const showToast = useCallback((msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    }, []);

    // --- Subscriptions ---

    // Map: heavy, throttle significantly
    useRosTopic<OccupancyGrid>("/map", { messageType: "nav_msgs/OccupancyGrid", throttleMs: 2000 }, (msg) => {
        setMapInfo(msg.info);
        setMapData(msg.data);
    });

    useRosTopic<Path>("/plan", { messageType: "nav_msgs/Path", throttleMs: 500 }, (msg) => {
        setGlobalPath(msg);
    });

    useRosTopic<Path>("/local_path", { messageType: "nav_msgs/Path", throttleMs: 150 }, (msg) => {
        setLocalPath(msg);
    });

    // Assume boolean std_msgs/Bool for goal_reached
    useRosTopic<{ data: boolean }>("/goal_reached", { messageType: "std_msgs/Bool" }, (msg) => {
        if (msg.data) showToast("GOAL REACHED SUCESSFULLY");
    });

    // --- Drawing Loop ---

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !mapInfo) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Create Offscreen canvas to render the static grid once per update
        const offscreen = new OffscreenCanvas(mapInfo.width, mapInfo.height);
        const offscreenCtx = offscreen.getContext("2d");
        if (offscreenCtx && mapData.length > 0) {
            const imgData = offscreenCtx.createImageData(mapInfo.width, mapInfo.height);
            for (let i = 0; i < mapData.length; i++) {
                const val = mapData[i];
                const rIndex = i * 4;
                if (val === -1) {
                    // Unknown: transparent or dark bg
                    imgData.data[rIndex] = 8;
                    imgData.data[rIndex + 1] = 12;
                    imgData.data[rIndex + 2] = 20;
                    imgData.data[rIndex + 3] = 0; // Transparent
                } else if (val === 0) {
                    // Free: Light gray / white with low opacity
                    imgData.data[rIndex] = 255;
                    imgData.data[rIndex + 1] = 255;
                    imgData.data[rIndex + 2] = 255;
                    imgData.data[rIndex + 3] = 20;
                } else {
                    // Occupied/Obstacle: solid color (e.g. blue)
                    imgData.data[rIndex] = 59;
                    imgData.data[rIndex + 1] = 130;
                    imgData.data[rIndex + 2] = 246;
                    imgData.data[rIndex + 3] = 255;
                }
            }
            offscreenCtx.putImageData(imgData, 0, 0);
        }

        // Render loop for the main canvas
        let animationFrameId: number;

        const render = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            // Handle resize
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
            }

            ctx.clearRect(0, 0, rect.width, rect.height);

            ctx.save();
            ctx.translate(transform.x, transform.y);
            // We want map origin (0,0) in bottom-left visually in ROS, 
            // but OccGrid array starts bottom-left row-major.
            // A common way to draw this is applying a transformation that mirrors Y.

            // Move to center of canvas initially
            ctx.translate(rect.width / 2, rect.height / 2);
            ctx.scale(transform.scale, -transform.scale); // Flip Y so +Y is up

            // Draw Map
            if (offscreenCtx) {
                // The map origin info.origin is where the bottom-left pixel (0,0 in array) is physically located.
                // We need to offset the drawing by this to align physical (0,0) to canvas (0,0).
                // Note: we divide by resolution to get from world coords to pixel coords.
                const mapOriginXPixels = mapInfo.origin.position.x / mapInfo.resolution;
                const mapOriginYPixels = mapInfo.origin.position.y / mapInfo.resolution;

                ctx.drawImage(
                    offscreen,
                    mapOriginXPixels,
                    mapOriginYPixels,
                    mapInfo.width,
                    mapInfo.height
                );
            }

            // Draw paths (World coords / resolution)
            const drawPath = (path: Path | null, color: string, width: number) => {
                if (!path || path.poses.length === 0) return;
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = width / transform.scale; // keep line width constant on screen
                ctx.lineJoin = "round";
                ctx.lineCap = "round";

                path.poses.forEach((p, i) => {
                    // World to Pixel
                    const px = p.pose.position.x / mapInfo.resolution;
                    const py = p.pose.position.y / mapInfo.resolution;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.stroke();
            };

            drawPath(globalPath, "var(--color-blue-glow)", 2);
            drawPath(localPath, "var(--color-emerald-glow)", 3);

            // Draw robot at origin (0,0 world) for now, assuming base_link. 
            // In a real scenario, use TF /tf to get base_link relative to map.
            ctx.beginPath();
            ctx.fillStyle = "var(--color-amber-glow)";
            ctx.arc(0, 0, 4 / transform.scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);

    }, [mapInfo, mapData, globalPath, localPath, transform]);


    // --- Interaction ---

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleBy = 1.1;
        const newScale = e.deltaY > 0 ? transform.scale / scaleBy : transform.scale * scaleBy;
        setTransform(prev => ({ ...prev, scale: Math.max(0.1, Math.min(newScale, 10)) }));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        // Right click to Pan, Left click to Nav
        if (e.button === 2 || e.shiftKey) {
            isDragging.current = true;
            lastPan.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
        } else if (e.button === 0 && mapInfo) {
            // Left click: Send Goal
            const rect = e.currentTarget.getBoundingClientRect();
            // Screen coords relative to center
            const screenX = e.clientX - rect.left - transform.x - rect.width / 2;
            const screenY = e.clientY - rect.top - transform.y - rect.height / 2;

            // Apply inverse transform (un-scale, un-flip Y)
            const mapPixelX = screenX / transform.scale;
            const mapPixelY = screenY / -transform.scale;

            // Convert map pixel coords back to world coords
            const worldX = mapPixelX * mapInfo.resolution;
            const worldY = mapPixelY * mapInfo.resolution;

            publishGoal({
                header: { frame_id: "map" },
                pose: {
                    position: { x: worldX, y: worldY, z: 0 },
                    orientation: { x: 0, y: 0, z: 0, w: 1 } // Default quaternion pointing straight
                }
            });
            showToast(`Seding goal at (${worldX.toFixed(2)}, ${worldY.toFixed(2)})`);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPan.current.x;
        const dy = e.clientY - lastPan.current.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastPan.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div ref={containerRef} className="glass-card" style={{
            position: "relative",
            width: "100%", height: "100%",
            overflow: "hidden",
            display: "flex", flexDirection: "column"
        }}>

            {/* Header info */}
            <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10, display: "flex", gap: "1rem", pointerEvents: "none" }}>
                <div>
                    <p style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Map View</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>
                        {mapInfo ? `${(mapInfo.width * mapInfo.resolution).toFixed(1)}m x ${(mapInfo.height * mapInfo.resolution).toFixed(1)}m` : "AWAITING /MAP"}
                    </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 2, background: "var(--color-blue-glow)" }} />
                        <span style={{ fontSize: "0.55rem", color: "var(--color-text-secondary)" }}>GLOBAL PATH</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 2, background: "var(--color-emerald-glow)" }} />
                        <span style={{ fontSize: "0.55rem", color: "var(--color-text-secondary)" }}>LOCAL PLAN</span>
                    </div>
                </div>
            </div>

            <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10, pointerEvents: "none" }}>
                <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>Left Click to Set Goal • Shift+Click to Pan • Scroll to Zoom</p>
            </div>

            <canvas
                ref={canvasRef}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onContextMenu={e => e.preventDefault()}
                style={{
                    width: "100%",
                    height: "100%",
                    cursor: isDragging.current ? "grabbing" : "crosshair",
                    touchAction: "none"
                }}
            />

            {/* Custom Hover Toast for Status */}
            <AnimatePresence>
                {toastMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
                        style={{
                            position: "absolute",
                            bottom: 24,
                            left: "50%",
                            x: "-50%",
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(52, 211, 153, 0.4)",
                            backdropFilter: "blur(12px)",
                            padding: "8px 20px",
                            borderRadius: 24,
                            color: "var(--color-emerald-primary)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(16,185,129,0.3)",
                            zIndex: 100,
                        }}
                    >
                        {toastMsg}
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
