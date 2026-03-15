import { useEffect, useRef, useCallback } from "react";
import { useRos } from "./RosContext";

interface UseRosPublisherOptions {
    messageType: string;
    latch?: boolean;
}

/**
 * Returns a stable `publish(msg)` function for a given ROS topic.
 * The underlying ROSLIB.Topic is created once and reused.
 *
 * @example
 * const publish = useRosPublisher("/cmd_vel_teleop", { messageType: "geometry_msgs/Twist" });
 * publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
 */
export function useRosPublisher<T = unknown>(
    topicName: string,
    options: UseRosPublisherOptions
): (msg: T) => void {
    const { ros } = useRos();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topicRef = useRef<any>(null);

    useEffect(() => {
        if (!ros) {
            topicRef.current = null;
            return;
        }

        let cancelled = false;
        import("roslib").then(({ Topic }) => {
            if (cancelled || !ros) return;
            topicRef.current = new Topic({
                ros,
                name: topicName,
                messageType: options.messageType,
                latch: options.latch ?? false,
            });
        });

        return () => {
            cancelled = true;
            topicRef.current = null;
        };
    }, [ros, topicName, options.messageType, options.latch]);

    const publish = useCallback(
        (msg: T) => {
            if (!topicRef.current) {
                console.warn(`[useRosPublisher] Not connected, cannot publish to ${topicName}`);
                return;
            }
            // roslib v2 publish accepts a plain object directly
            topicRef.current?.publish(msg as object);
        },
        [topicName]
    );

    return publish;
}
