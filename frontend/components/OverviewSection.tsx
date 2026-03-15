"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import TelemetryDashboard from "@/components/TelemetryDashboard";
import VirtualJoystick from "@/components/VirtualJoystick";
import EmergencyConsole from "@/components/EmergencyConsole";
import SystemHeartbeat from "@/components/SystemHeartbeat";

export default function OverviewSection() {
    const containerVariants: Variants = {
        hidden: {},
        visible: {
            transition: { staggerChildren: 0.1, delayChildren: 0.05 },
        },
        exit: {
            transition: { staggerChildren: 0.05, staggerDirection: -1 },
        },
    };

    const widgetVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        visible: {
            opacity: 1, y: 0, scale: 1,
            transition: { type: "spring", stiffness: 260, damping: 22 },
        },
        exit: {
            opacity: 0, y: -10, scale: 0.97,
            transition: { duration: 0.18 },
        },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
                display: "grid",
                gridTemplateColumns: "1fr 340px",
                gridTemplateRows: "auto auto auto",
                gap: "1.25rem",
                flex: 1,
                height: "100%",
            }}
        >
            {/* Main Overview Area */}
            <motion.div variants={widgetVariants} style={{ gridColumn: "1", gridRow: "1 / 4" }}>
                <SystemHeartbeat />
            </motion.div>

            {/* Right Column: Telemetry, Joystick, E-Stop */}
            <motion.div variants={widgetVariants} style={{ gridColumn: "2", gridRow: "1" }}>
                <TelemetryDashboard />
            </motion.div>

            <motion.div variants={widgetVariants} style={{ gridColumn: "2", gridRow: "2", display: "flex", justifyContent: "center" }}>
                <VirtualJoystick />
            </motion.div>

            <motion.div variants={widgetVariants} style={{ gridColumn: "2", gridRow: "3" }}>
                <EmergencyConsole />
            </motion.div>
        </motion.div>
    );
}
