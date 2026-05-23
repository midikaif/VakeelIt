import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { checkPdfWorkerHealth } from "@/services/pdfWorkerHealthCheck";

interface StatusState {
  backendOnline: boolean;
  pdfWorkerOnline: boolean;
  isWarmingUp: boolean;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
const HEALTH_CHECK_INTERVAL = 10000; // Check every 10 seconds

export default function StatusBar() {
  const [status, setStatus] = useState<StatusState>({
    backendOnline: false,
    pdfWorkerOnline: false,
    isWarmingUp: false,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Check backend health
        const backendResponse = await fetch(`${API_URL}/api/health`, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        const backendOnline = backendResponse.ok;

        // Check PDF worker health
        const pdfWorkerResult = await checkPdfWorkerHealth();

        setStatus({
          backendOnline,
          pdfWorkerOnline: pdfWorkerResult.isOnline,
          isWarmingUp: pdfWorkerResult.isWarmingUp,
        });
      } catch (error) {
        console.log("[StatusBar] Health check failed:", error);
        setStatus({
          backendOnline: false,
          pdfWorkerOnline: false,
          isWarmingUp: true,
        });
      }
    };

    // Initial check
    checkHealth();

    // Set up periodic checks
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Determine status display
  const isLive = status.backendOnline && status.pdfWorkerOnline;
  const statusText = isLive
    ? "Live"
    : status.isWarmingUp
      ? "Coming Online"
      : "Offline";
  const statusColor = isLive
    ? "#10B981"
    : status.isWarmingUp
      ? "#F59E0B"
      : "#EF4444";

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: statusColor }]} />
      <Text style={styles.text}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
});
