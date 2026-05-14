"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HUD() {
    // Track if the stream is loading, error, or success
    const [status, setStatus] = useState("loading"); 
    
    // Hold the dynamic URL in state to avoid Next.js build errors
    const [streamUrl, setStreamUrl] = useState<string>("");

    useEffect(() => {
        // Dynamically grab the Tailscale or Local Wi-Fi IP the browser is using
        // Port 8080 is standard for ROS web_video_server
        setStreamUrl(`http://${window.location.hostname}:8080/stream?topic=/camera/color/image_raw`);
    }, []);

    return (
        <div className="glass-card" style={{ 
            position: "relative", 
            overflow: "hidden", 
            aspectRatio: "16/9", 
            width: "100%",
            background: "#080c14" 
        }}>
            
            {/* 1. Live Video Stream */}
            {/* Only render the image tag once we have safely generated the URL on the client */}
            {streamUrl && (
                <img
                    src={streamUrl}
                    alt="Depth camera stream"
                    style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover", 
                        display: status === "success" ? "block" : "none" 
                    }}
                    onLoad={() => setStatus("success")}
                    onError={() => setStatus("error")}
                />
            )}

            {/* 2. Fallback UI - Visible when error or loading */}
            <AnimatePresence>
                {status !== "success" && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "absolute", inset: 0,
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            background: "rgba(8,12,20,0.95)",
                            zIndex: 1,
                        }}
                    >
                        {/* Animated Loading Ring */}
                        {status === "loading" && (
                             <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                style={{
                                    width: 40, height: 40,
                                    border: "2px solid rgba(59, 130, 246, 0.2)",
                                    borderTop: "2px solid #3b82f6",
                                    borderRadius: "50%",
                                    marginBottom: 16
                                }}
                             />
                        )}

                        <p style={{ 
                            color: status === "error" ? "#ef4444" : "rgba(255,255,255,0.4)", 
                            fontSize: "0.7rem", 
                            letterSpacing: "0.2em", 
                            textTransform: "uppercase",
                            fontWeight: 600
                        }}>
                            {status === "error" ? "NO SIGNAL RECEIVED" : "INITIALIZING STREAM..."}
                        </p>
                        
                        {status === "error" && (
                            <button 
                                onClick={() => { setStatus("loading"); window.location.reload(); }}
                                style={{ marginTop: 12, fontSize: '0.6rem', color: '#3b82f6', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                RETRY CONNECTION
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. Static HUD Overlays (Always Visible) */}
            <div style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ opacity: status === "success" ? 1 : 0.3 }}>
                     {/* Corner brackets */}
                     {[
                        "M 10 30 L 10 10 L 30 10",
                        "M 90 10 L 110 10 L 110 30",
                        "M 110 90 L 110 110 L 90 110",
                        "M 30 110 L 10 110 L 10 90",
                    ].map((d, i) => (
                        <motion.path
                            key={i}
                            d={d}
                            fill="none"
                            strokeWidth={2}
                            stroke="#3b82f6"
                            strokeLinecap="round"
                        />
                    ))}
                    <circle cx="60" cy="60" r="2" fill="#3b82f6" />
                </svg>
            </div>

            <div style={{ position: "absolute", top: 12, left: 14, zIndex: 3 }}>
                <span style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                    SYSTEM.DEPTH_CAM
                </span>
            </div>
        </div>
    );
}