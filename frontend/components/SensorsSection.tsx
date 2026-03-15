"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import HUD from "@/components/HUD";
import LidarView from "@/components/LidarView";

export default function SensorsSection() {
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
                gridTemplateColumns: "1fr 1fr",
                gap: "1.25rem",
                flex: 1,
                height: "100%",
            }}
        >
            <motion.div variants={widgetVariants}>
                <HUD />
            </motion.div>

            <motion.div variants={widgetVariants}>
                <LidarView />
            </motion.div>
        </motion.div>
    );
}
