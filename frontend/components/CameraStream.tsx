"use client";

import { motion } from "framer-motion";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

interface CameraStreamProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CameraStream({ isOpen, onClose }: CameraStreamProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: "fixed",
        zIndex: 1000,
        right: isExpanded ? 0 : "20px",
        bottom: isExpanded ? 0 : "20px",
        width: isExpanded ? "100vw" : "320px",
        height: isExpanded ? "100vh" : "240px",
        borderRadius: isExpanded ? 0 : "12px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
      }}
      className="glass-card"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "rgba(0, 0, 0, 0.3)",
          borderBottom: "1px solid rgba(59, 130, 246, 0.2)",
        }}
      >
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Camera Feed
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "rgba(59, 130, 246, 0.2)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "8px",
              padding: "6px 8px",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--color-blue-glow)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(59, 130, 246, 0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--color-text-muted)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(59, 130, 246, 0.3)";
            }}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </motion.button>
          <motion.button
            onClick={onClose}
            style={{
              background: "rgba(220, 38, 38, 0.2)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              borderRadius: "8px",
              padding: "6px 8px",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "rgb(220, 38, 38)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(220, 38, 38, 0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--color-text-muted)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(220, 38, 38, 0.3)";
            }}
          >
            <X size={16} />
          </motion.button>
        </div>
      </div>

      {/* Camera Feed Container */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 48px)",
          background: "var(--color-glass-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Placeholder for actual camera stream */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(30, 30, 60, 0.4)",
          }}
        />

        {/* Camera icon and text */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(59, 130, 246, 0.1)",
              border: "2px solid rgba(59, 130, 246, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--color-blue-glow)" }}
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-secondary)",
                fontWeight: 500,
              }}
            >
              Camera Stream
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                marginTop: "4px",
              }}
            >
              Connect ROS topic to view
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <motion.div
          animate={{
            boxShadow: [
              "0 0 4px rgba(16, 185, 129, 1)",
              "0 0 12px rgba(16, 185, 129, 1)",
              "0 0 4px rgba(16, 185, 129, 1)",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            zIndex: 2,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.8)",
          }}
        />
      </div>
    </motion.div>
  );
}
