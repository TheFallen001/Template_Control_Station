"use client";

import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import MapViewer from "@/components/MapViewer";
import ChatBox from "@/components/ChatBox";

export default function MissionControlSection() {
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
                display: "flex",
                flexDirection: "row",
                gap: "1.25rem",
                flex: 1,
                height: "100%",
            }}
        >
            <motion.div variants={widgetVariants} style={{ flex: 1, minHeight: 0 }}>
                <MapViewer />
            </motion.div>
            <motion.div variants={widgetVariants} style={{ display: "flex", minHeight: 0 }}>
                <ChatBox />
            </motion.div>
        </motion.div>
    );
}
