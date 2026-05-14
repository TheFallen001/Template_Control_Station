"use client";

import CameraStream from "@/components/CameraStream";
import MissionControlSection from "@/components/MissionControlSection";
import OverviewSection from "@/components/OverviewSection";
import SensorsSection from "@/components/SensorsSection";
import Sidebar, { Section } from "@/components/Sidebar";
import { useRos } from "@/lib/RosContext";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

// ── Status indicator ──────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  connected: "#10b981",
  connecting: "#f59e0b",
  error: "#dc2626",
  disconnected: "#475569",
};

const STATUS_LABEL: Record<string, string> = {
  connected: "ONLINE",
  connecting: "CONNECTING",
  error: "ERROR",
  disconnected: "OFFLINE",
};

function StatusPill({ status, url }: { status: string; url: string }) {
  const dot = STATUS_DOT[status] ?? "#475569";
  return (
    <motion.div
      layout
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--color-glass-bg)",
        border: "1px solid var(--color-glass-border)",
        borderRadius: 20, padding: "6px 14px",
        backdropFilter: "blur(8px)",
      }}
    >
      <motion.span
        animate={{
          boxShadow: [
            `0 0 4px ${dot}`,
            `0 0 14px ${dot}`,
            `0 0 4px ${dot}`,
          ],
          opacity: status === "connected" ? [1, 0.55, 1] : 1,
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 8, height: 8, borderRadius: "50%",
          background: dot,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <motion.span
        key={status}
        initial={{ opacity: 0, x: 4 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          fontSize: "0.65rem",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {STATUS_LABEL[status] ?? status}
      </motion.span>
      <span style={{ fontSize: "0.58rem", color: "var(--color-text-muted)", marginLeft: 2 }}>{url}</span>
    </motion.div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function RobotDashboard() {
  const { status, url } = useRos();
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  return (
    <>
      <div className="scan-overlay" aria-hidden="true" />

      <div style={{
        position: "relative", zIndex: 1,
        height: "100vh",
        display: "flex",
        fontFamily: "var(--font-sans)",
        overflow: "hidden"
      }}>
        {/* Sidebar */}
        <Sidebar activeSection={activeSection} onSelect={setActiveSection} onCameraClick={() => setIsCameraOpen(true)} />

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          display: "flex", flexDirection: "column",
          padding: "1.25rem 2rem", gap: "1.5rem",
          overflowY: "auto",
        }}>
          {/* Top Bar */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                style={{
                  fontSize: "0.6rem", letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: "var(--color-blue-glow)", marginBottom: 2,
                }}
              >
                ROS 2 Control Station
              </motion.p>
              <h1 style={{
                fontSize: "1.5rem", fontWeight: 700,
                color: "var(--color-text-primary)", letterSpacing: "-0.02em",
              }}>
                {activeSection === "overview" && "System Overview"}
                {activeSection === "sensors" && "Sensor Visualization"}
                {activeSection === "mission_control" && "Mission Control"}
              </h1>
            </div>

            <StatusPill status={status} url={url} />
          </motion.header>

          {/* Dynamic Section Content */}
          <div style={{ position: "relative", flex: 1 }}>
            <AnimatePresence mode="wait">
              {activeSection === "overview" && (
                <motion.div key="overview" style={{ position: "absolute", inset: 0 }}>
                  <OverviewSection />
                </motion.div>
              )}
              {activeSection === "sensors" && (
                <motion.div key="sensors" style={{ position: "absolute", inset: 0 }}>
                  <SensorsSection />
                </motion.div>
              )}
              {activeSection === "mission_control" && (
                <motion.div key="mission_control" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0 }}>
                  <MissionControlSection />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Camera Stream Overlay */}
      <AnimatePresence>
        <CameraStream isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} />
      </AnimatePresence>
    </>
  );
}