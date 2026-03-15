"use client";

import { useRef, useEffect } from "react";
import { useRosTopic } from "@/lib/useRosTopic";

interface LaserScanMsg {
    angle_min: number;
    angle_max: number;
    angle_increment: number;
    range_min: number;
    range_max: number;
    ranges: number[];
}

export default function LidarView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const VIEW_RADIUS = 8; // Adjust this! (How many meters the canvas edge represents)

    useRosTopic<LaserScanMsg>("/scan", { messageType: "sensor_msgs/LaserScan", throttleMs: 50 }, (msg) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { width, height } = canvas;
        const cx = width / 2;
        const cy = height / 2;

        // 1. Better clear: Fade effect can be too aggressive if frame rate is low
        ctx.fillStyle = "rgba(8, 12, 20, 0.4)"; 
        ctx.fillRect(0, 0, width, height);

        // 2. Fallback color: if the CSS variable is missing, use a direct hex
        const glowColor = "#3b82f6"; 
        ctx.fillStyle = glowColor;
        
        // 3. Scale calculation based on a fixed view radius
        const scale = (Math.min(width, height) / 2) / VIEW_RADIUS;

        // Draw robot center
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < msg.ranges.length; i++) {
            const range = msg.ranges[i];

            // Ignore invalid readings (NaN, Infinity, or out of bounds)
            if (!range || range < msg.range_min || range > msg.range_max) continue;

            const angle = msg.angle_min + i * msg.angle_increment;
            
            // Polar to Cartesian conversion
            // Standard ROS: 0 is forward. Browser: -PI/2 is "up".
            const x = cx + range * Math.cos(angle - Math.PI / 2) * scale;
            const y = cy + range * Math.sin(angle - Math.PI / 2) * scale;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    useEffect(() => {
        // Initial setup for grid
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#080c14";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw static grid lines (every 1m assuming max_range ~ 5m-10m)
        ctx.strokeStyle = "rgba(59, 130, 246, 0.15)";
        ctx.lineWidth = 1;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rings = 5;
        const maxExpectedRange = 10;
        const scale = Math.min(canvas.width, canvas.height) / (maxExpectedRange * 2 * 1.5);

        for (let i = 1; i <= rings; i++) {
            const r = (maxExpectedRange / rings) * i * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

    }, []);

    return (
        <div className="glass-card" style={{
            position: "relative",
            overflow: "hidden",
            aspectRatio: "16/9",
            width: "100%",
            background: "#080c14",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <canvas
                ref={canvasRef}
                width={800}
                height={450}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain"
                }}
            />

            <div style={{ position: "absolute", top: 12, left: 14, zIndex: 10 }}>
                <span style={{ fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                    LIDAR / SCAN
                </span>
            </div>

            {/* Grid crosshair CSS overlay for sharp lines without canvas redraw overhead */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 1, height: "100%", background: "rgba(59, 130, 246, 0.2)" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "100%", height: 1, background: "rgba(59, 130, 246, 0.2)" }} />
            </div>
        </div>
    );
}
