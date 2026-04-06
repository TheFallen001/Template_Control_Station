"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Mic, Pause } from "lucide-react";
import { useRosPublisher } from "@/lib/useRosPublisher";

const BACKEND_URL = "http://localhost:8000";
const pollRate = 4000; // Poll every 2 seconds

interface GoalPoseMsg {
    header: { frame_id: string };
    pose: {
        position: { x: number; y: number; z: number };
        orientation: { x: number; y: number; z: number; w: number };
    };
}

interface Message {
    id: string;
    text: string;
    sender: "user" | "system";
    timestamp: Date;
}

interface coordinates {
    x: number;
    y: number;
    yaw: number;
}

interface llmResponse {
    found: boolean;
    goalLabel?: string;
    goalPose?: coordinates;
}

interface vlmResponse {
    found: boolean;
    identifiedObjectLabel?: string;
    objectLocation?: coordinates;
    is_active: boolean;
}

export default function ChatBox() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [contactVLM, setContactVLM] = useState<boolean>(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    // ROS Publisher for goal positions
    const publishGoal = useRosPublisher<GoalPoseMsg>("/goal_pose", { messageType: "geometry_msgs/PoseStamped" });

    const initializeSpeechRecognition = () => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition && !recognitionRef.current) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.lang = "en-US";

                recognition.onstart = () => {
                    setIsRecording(true);
                };

                recognition.onresult = (event: any) => {
                    let transcript = "";
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcriptSegment = event.results[i][0].transcript;
                        transcript += transcriptSegment;
                    }
                    setInputValue(transcript);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    const errorMessage: Message = {
                        id: Date.now().toString(),
                        text: `Speech recognition error: ${event.error}`,
                        sender: "system",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, errorMessage]);
                    setIsRecording(false);
                };

                recognition.onend = () => {
                    setIsRecording(false);
                };

                recognitionRef.current = recognition;
            }
        }
    };

    const handleToggleSpeech = () => {
        if (!recognitionRef.current) {
            initializeSpeechRecognition();
        }

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendGoalToRobot = (x: number, y: number, yaw: number = 0) => {
        publishGoal({
            header: { frame_id: "map" },
            pose: {
                position: { x, y, z: 0 },
                orientation: { x: 0, y: 0, z: Math.sin(yaw / 2), w: Math.cos(yaw / 2) }
            }
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Cleanup polling and speech recognition when component unmounts
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const pollVLMUpdates = async () => {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/pollState`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    console.log("Polling error: ", response.statusText);
                    const errorMessage: Message = {
                        id: Date.now().toString(),
                        text: "Error polling VLM endpoint",
                        sender: "system",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, errorMessage]);
                    clearInterval(pollInterval);
                    pollingIntervalRef.current = null;
                    setIsLoading(false);
                    return;
                }

                const data = (await response.json()) as vlmResponse;

                if(!data.identifiedObjectLabel || !data.objectLocation) {
                    console.log("Polling error: Missing identified object label or coordinates.");
                    const errorMessage: Message = {
                        id: Date.now().toString(),
                        text: "Error polling VLM endpoint, retrying in a moment...",
                        sender: "system",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, errorMessage]);
                    return;
                }

                if (data.is_active) {
                    setIsLoading(false);

                    if(data.found) {

                        const foundMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            text: `Proceeding to found object: ${data.identifiedObjectLabel} located at [x: ${data.objectLocation.x.toFixed(2)}, y: ${data.objectLocation.y.toFixed(2)}, yaw: ${data.objectLocation.yaw.toFixed(2)}]`,
                            sender: "system",
                            timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, foundMessage]);
                    }
                    else {
                        const notFoundMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            text: `Proceeding to possible object location: ${data.identifiedObjectLabel} located at [x: ${data.objectLocation.x.toFixed(2)}, y: ${data.objectLocation.y.toFixed(2)}, yaw: ${data.objectLocation.yaw.toFixed(2)}]`,
                            sender: "system",
                            timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, notFoundMessage]);
                    }
                }
                else {
                    if(data.found) {

                        const foundMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            text: `Found object: ${data.identifiedObjectLabel} located at [x: ${data.objectLocation.x.toFixed(2)}, y: ${data.objectLocation.y.toFixed(2)}, yaw: ${data.objectLocation.yaw.toFixed(2)}]`,
                            sender: "system",
                            timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, foundMessage]);
                    }
                    else {
                        const notFoundMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            text: `Could not find object. Last identified location: ${data.identifiedObjectLabel} at [x: ${data.objectLocation.x.toFixed(2)}, y: ${data.objectLocation.y.toFixed(2)}, yaw: ${data.objectLocation.yaw.toFixed(2)}]`,
                            sender: "system",
                            timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, notFoundMessage]);
                    }
                    clearInterval(pollInterval);
                    pollingIntervalRef.current = null;
                    setContactVLM(false);
                    setIsLoading(false);

                }

                // sendGoalToRobot(data.objectLocation.x, data.objectLocation.y, data.objectLocation.yaw);
                    
                return;

            } catch (error) {
                const errorMessage: Message = {
                    id: Date.now().toString(),
                    text: `Polling error: ${error instanceof Error ? error.message : "Unknown error"}`,
                    sender: "system",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
                clearInterval(pollInterval);
                pollingIntervalRef.current = null;
                setIsLoading(false);
            }
        }, pollRate); // Poll every 2 seconds

        pollingIntervalRef.current = pollInterval;
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentInput = inputValue;
        setInputValue("");
        setIsLoading(true);

        if (!contactVLM) {
            // First contact LLM to check for predefined goals
            try {
                const response = await fetch(`${BACKEND_URL}/contactLLM`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: currentInput,
                    }),
                });

                if (!response.ok) {
                    const errorMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        text: "Failed to send message to LLM endpoint",
                        sender: "system",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, errorMessage]);
                    setIsLoading(false);
                } else {
                    const data = (await response.json()) as llmResponse;
                    if (data.found) {
                        const systemMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            text: `Proceeding to found goal: ${data.goalLabel} at [x: ${data.goalPose?.x}, y: ${data.goalPose?.y}, yaw: ${data.goalPose?.yaw}]`,
                            sender: "system",
                            timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, systemMessage]);
                        sendGoalToRobot(data.goalPose!.x, data.goalPose!.y, data.goalPose!.yaw);
                        setIsLoading(false);
                    } else {
                        const goalNotFoundMessage: Message = {
                            id: (Date.now() + 1).toString(),
                            text: "Predefined goal not found. Please describe how your goal location/object looks like for me to search the environment for it.",
                            sender: "system",
                            timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, goalNotFoundMessage]);
                        setContactVLM(true);
                        setIsLoading(false);
                    }
                }
            } catch (error) {
                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                    sender: "system",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
                setIsLoading(false);
            }
        } else {
            // Contact VLM to start search and begin polling for updates
            const startingMessage: Message = {
                id: Date.now().toString(),
                text: "Robot starting visual search...",
                sender: "system",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, startingMessage]);

            try {
                // Initial POST to /contactVLM to start the search
                const startResponse = await fetch(`${BACKEND_URL}/contactVLM`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: currentInput,
                    }),
                });

                if (!startResponse.ok) {
                    const errorMessage: Message = {
                        id: Date.now().toString(),
                        text: "Failed to start VLM search",
                        sender: "system",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, errorMessage]);
                    setIsLoading(false);
                    return;
                }
                
                // Start polling /pollState for updates
                pollVLMUpdates();
            } catch (error) {
                const errorMessage: Message = {
                    id: Date.now().toString(),
                    text: `Error starting search: ${error instanceof Error ? error.message : "Unknown error"}`,
                    sender: "system",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
                setIsLoading(false);
            }
        }
    }    
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            style={{
                display: "flex",
                flexDirection: "column",
                width: "20rem",
                height: "100%",
                backgroundColor: "var(--color-glass-bg)",
                border: "1px solid var(--color-glass-border)",
                borderRadius: "0.75rem",
                backdropFilter: "blur(10px)",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: "1rem",
                    borderBottom: "1px solid var(--color-glass-border)",
                    backgroundColor: "rgba(37, 99, 235, 0.05)",
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "var(--color-text-primary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    Mission Chat
                </h3>
            </div>

            {/* Messages Container */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                }}
            >
                {messages.length === 0 && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "var(--color-text-muted)",
                            fontSize: "0.875rem",
                        }}
                    >
                        No messages yet
                    </div>
                )}

                {messages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            display: "flex",
                            justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                        }}
                    >
                        <div
                            style={{
                                maxWidth: "85%",
                                padding: "0.5rem 0.75rem",
                                borderRadius: "0.5rem",
                                backgroundColor:
                                    message.sender === "user"
                                        ? "rgba(37, 99, 235, 0.25)"
                                        : "rgba(16, 185, 129, 0.15)",
                                border:
                                    message.sender === "user"
                                        ? "1px solid rgba(37, 99, 235, 0.4)"
                                        : "1px solid rgba(16, 185, 129, 0.3)",
                                color:
                                    message.sender === "user"
                                        ? "var(--color-text-primary)"
                                        : "var(--color-text-secondary)",
                                fontSize: "0.875rem",
                                lineHeight: "1.4",
                            }}
                        >
                            {message.text}
                        </div>
                    </motion.div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
                onSubmit={handleSendMessage}
                style={{
                    padding: "1rem",
                    borderTop: "1px solid var(--color-glass-border)",
                    backgroundColor: "rgba(13, 21, 36, 0.5)",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                }}
            >
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type or speak message..."
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid var(--color-glass-border)",
                        borderRadius: "0.375rem",
                        color: "var(--color-text-primary)",
                        fontSize: "0.875rem",
                        outline: "none",
                        transition: "all 0.2s",
                        cursor: isLoading ? "not-allowed" : "text",
                        opacity: isLoading ? 0.6 : 1,
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = "rgba(37, 99, 235, 0.6)";
                        e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.08)";
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-glass-border)";
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                    }}
                />
                <button
                    type="button"
                    onClick={handleToggleSpeech}
                    disabled={isLoading}
                    title={isRecording ? "Stop recording" : "Start recording"}
                    style={{
                        padding: "0.5rem 0.75rem",
                        backgroundColor: isRecording
                            ? "rgba(220, 38, 38, 0.6)"
                            : "rgba(37, 99, 235, 0.5)",
                        border: isRecording
                            ? "1px solid rgba(220, 38, 38, 0.5)"
                            : "1px solid rgba(37, 99, 235, 0.5)",
                        borderRadius: "0.375rem",
                        color: "var(--color-text-primary)",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        opacity: isLoading ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                        if (!isLoading) {
                            e.currentTarget.style.backgroundColor = isRecording
                                ? "rgba(220, 38, 38, 0.8)"
                                : "rgba(37, 99, 235, 0.8)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isLoading) {
                            e.currentTarget.style.backgroundColor = isRecording
                                ? "rgba(220, 38, 38, 0.6)"
                                : "rgba(37, 99, 235, 0.5)";
                        }
                    }}
                >
                    {isRecording ? <Pause size={16} /> : <Mic size={16} />}
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                        padding: "0.5rem 0.75rem",
                        backgroundColor:
                            isLoading || !inputValue.trim()
                                ? "rgba(37, 99, 235, 0.3)"
                                : "rgba(37, 99, 235, 0.6)",
                        border: "1px solid rgba(37, 99, 235, 0.5)",
                        borderRadius: "0.375rem",
                        color: "var(--color-text-primary)",
                        cursor: isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        opacity: isLoading || !inputValue.trim() ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                        if (!isLoading && inputValue.trim()) {
                            e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.8)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isLoading && inputValue.trim()) {
                            e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.6)";
                        }
                    }}
                >
                    <Send size={16} />
                </button>
            </form>
        </motion.div>
    );
}