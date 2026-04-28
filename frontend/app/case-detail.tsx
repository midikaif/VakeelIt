import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AnalysisRenderer from "@/components/AnalysisRenderer";
import { showAlert } from "@/utils/alert";
import api from '../src/services/api';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function CaseDetailScreen() {
  const { caseId, caseTitle } = useLocalSearchParams<{
    caseId: string;
    caseTitle: string;
  }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [caseData, setCaseData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadCaseDetail();
  }, [caseId]);

  const loadCaseDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/case/detail/${caseId}`);
      setCaseData(response.data.case);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error loading case detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendFollowUp = async () => {
    if (!newQuestion.trim()) return;

    const question = newQuestion.trim();
    setNewQuestion("");
    setSending(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const formData = new FormData();
      formData.append("case_id", caseId || "");
      formData.append("question", question);

      const response = await api.post('/case/followup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Replace temp msg with real ones
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, response.data.user_message, response.data.ai_message];
      });
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        showAlert("Timeout", "Response took too long. Please try again.");
      } else {
        showAlert("Error", error.response?.data?.detail || "Network error. Please try again.");
      }
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading case...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {caseTitle || caseData?.case_title || "Case Detail"}
          </Text>
          <Text style={styles.headerSubtitle}>{caseData?.case_type} Case</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {/* Original Case Info */}
          <View style={styles.caseInfoCard}>
            <View style={styles.caseInfoHeader}>
              <Ionicons name="briefcase" size={20} color="#10B981" />
              <Text style={styles.caseInfoTitle}>Original Case</Text>
            </View>
            <Text style={styles.caseInfoDesc}>
              {caseData?.case_description}
            </Text>
            <Text style={styles.caseInfoDate}>
              {caseData?.created_at
                ? new Date(caseData.created_at).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </Text>
          </View>

          {/* AI Analysis - beautifully formatted */}
          {caseData?.analysis && (
            <View style={styles.analysisSection}>
              <View style={styles.analysisSectionHeader}>
                <Ionicons name="sparkles" size={20} color="#4F46E5" />
                <Text style={styles.analysisSectionTitle}>
                  AI Legal Analysis
                </Text>
              </View>
              <AnalysisRenderer rawAnalysis={caseData.analysis} />
            </View>
          )}

          {/* Divider before chat */}
          {messages.length > 0 && (
            <View style={styles.chatDivider}>
              <View style={styles.chatDividerLine} />
              <Text style={styles.chatDividerText}>Follow-up Questions</Text>
              <View style={styles.chatDividerLine} />
            </View>
          )}

          {/* Chat Messages */}
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === "user" ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <View style={styles.messageHeader}>
                <Ionicons
                  name={msg.role === "user" ? "person" : "sparkles"}
                  size={16}
                  color={msg.role === "user" ? "#4F46E5" : "#10B981"}
                />
                <Text style={styles.messageRole}>
                  {msg.role === "user" ? "You" : "AI Assistant"}
                </Text>
              </View>
              <Text style={styles.messageContent}>{msg.content}</Text>
            </View>
          ))}

          {sending && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.messageHeader}>
                <Ionicons name="sparkles" size={16} color="#10B981" />
                <Text style={styles.messageRole}>AI Assistant</Text>
              </View>
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.typingText}>
                  Analyzing your question...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask a follow-up question..."
            value={newQuestion}
            onChangeText={setNewQuestion}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            testID="send-followup-btn"
            style={[
              styles.sendBtn,
              (!newQuestion.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={sendFollowUp}
            disabled={!newQuestion.trim() || sending}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  caseInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  caseInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  caseInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 8,
  },
  caseInfoDesc: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  caseInfoDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  analysisSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 8,
  },
  chatDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  chatDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  chatDividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  messageBubble: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    maxWidth: "92%",
  },
  userBubble: {
    backgroundColor: "#EEF2FF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  messageRole: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  messageContent: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 8,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1F2937",
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#C7D2FE",
  },
});
