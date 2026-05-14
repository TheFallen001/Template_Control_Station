"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RosStatus = "connecting" | "connected" | "error" | "disconnected";

export interface RosContextValue {
    /** The live ROSLIB.Ros instance – null until the browser has initialised it */
    ros: InstanceType<typeof import("roslib").Ros> | null;
    status: RosStatus;
    /** Call this to force a reconnect (e.g. from a UI button) */
    reconnect: () => void;
    /** The websocket URL currently in use */
    url: string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const RosContext = createContext<RosContextValue>({
    ros: null,
    status: "disconnected",
    reconnect: () => { },
    url: "",
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const getRosUrl = () => {
    // Only access 'window' if we are in the browser
    if (typeof window !== "undefined") {
        return process.env.NEXT_PUBLIC_ROS_URL ?? `ws://${window.location.hostname}:9090`;
    }
    // Safe fallback for the Node.js build environment
    return process.env.NEXT_PUBLIC_ROS_URL ?? "ws://localhost:9090"; 
};

/** Milliseconds to wait before attempting a reconnect after a close/error */
const RECONNECT_DELAY_MS = 3_000;

export function RosProvider({ children }: { children: ReactNode }) {
    const [ros, setRos] = useState<RosContextValue["ros"]>(null);
    const [status, setStatus] = useState<RosStatus>("disconnected");

    // Keep a stable ref to the ROSLIB instance so event listeners always close
    // over the latest value without needing it in dependency arrays.
    const rosRef = useRef<RosContextValue["ros"]>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track whether the provider is still mounted so we never setState after unmount
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        // Bail out in SSR environments – roslibjs requires window / WebSocket
        if (typeof window === "undefined") return;

        // Tear down any previous instance cleanly
        if (rosRef.current) {
            try {
                rosRef.current.close();
            } catch (_) { }
            rosRef.current = null;
        }

        if (!mountedRef.current) return;
        setStatus("connecting");

        // Dynamic import keeps roslibjs out of the server bundle entirely
        import("roslib").then(({ Ros }) => {
            if (!mountedRef.current) return;

            const instance = new Ros({ url: getRosUrl() });
            rosRef.current = instance;

            instance.on("connection", () => {
                if (!mountedRef.current) return;
                setStatus("connected");
                setRos(instance);
            });

            instance.on("error", (err: unknown) => {
                if (!mountedRef.current) return;
                console.error("[RosContext] connection error:", err);
                setStatus("error");
                setRos(null);
                scheduleReconnect();
            });

            instance.on("close", () => {
                if (!mountedRef.current) return;
                setStatus("disconnected");
                setRos(null);
                scheduleReconnect();
            });
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current) connect();
        }, RECONNECT_DELAY_MS);
    }, [connect]);

    // Initial connection on mount
    useEffect(() => {
        mountedRef.current = true;
        connect();

        return () => {
            mountedRef.current = false;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (rosRef.current) {
                try {
                    rosRef.current.close();
                } catch (_) { }
            }
        };
    }, [connect]);

    const reconnect = useCallback(() => {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        connect();
    }, [connect]);

    return (
        <RosContext.Provider value={{ ros, status, reconnect, url: getRosUrl() }}>
            {children}
        </RosContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the persistent ROS2 connection from any client component.
 *
 * @example
 * const { ros, status, reconnect } = useRos();
 */
export function useRos(): RosContextValue {
    return useContext(RosContext);
}
