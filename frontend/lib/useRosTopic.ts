import { useEffect, useRef, useCallback } from "react";
import { useRos } from "./RosContext";

type MessageHandler<T> = (msg: T) => void;

interface UseRosTopicOptions {
    /** ROS message type, e.g. "nav_msgs/Odometry" */
    messageType: string;
    /** Throttle rate in ms (0 = no throttle, undefined = default) */
    throttleMs?: number;
}

/**
 * Subscribe to a ROS topic. The callback fires on every received message.
 * Subscription is automatically created/torn-down with the ROS connection.
 *
 * @example
 * useRosTopic<OdomMsg>("/odom", { messageType: "nav_msgs/Odometry" }, (msg) => {
 *   setVelocity(msg.twist.twist.linear.x);
 * });
 */
export function useRosTopic<T = unknown>(
    topicName: string,
    options: UseRosTopicOptions,
    onMessage: MessageHandler<T>
) {
    const { ros } = useRos();
    // Keep the callback ref stable so the subscription doesn't re-subscribe
    // every time the parent re-renders.
    const handlerRef = useRef<MessageHandler<T>>(onMessage);
    useEffect(() => { handlerRef.current = onMessage; }, [onMessage]);

    const subscribe = useCallback(() => {
        if (!ros) return undefined;

        // Dynamic import to stay SSR-safe
        return import("roslib").then(({ Topic }) => {
            const topic = new Topic({
                ros,
                name: topicName,
                messageType: options.messageType,
                throttle_rate: options.throttleMs ?? 0,
                queue_length: 1,
            });

            const handler = (msg: T) => handlerRef.current(msg);
            topic.subscribe(handler as (msg: unknown) => void);

            return () => {
                try { topic.unsubscribe(); } catch (_) { }
            };
        });
    }, [ros, topicName, options.messageType, options.throttleMs]);

    useEffect(() => {
        let cleanup: (() => void) | undefined;
        let cancelled = false;

        const result = subscribe();
        if (!result) return;
        result.then((teardown) => {
            if (!cancelled && teardown) cleanup = teardown;
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [subscribe]);
}
