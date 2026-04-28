import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import AnalysisLoader from "@/components/AnalysisLoader";
import AnalysisRenderer from "@/components/AnalysisRenderer";
import { showAlert } from "@/utils/alert";
import api from '../../src/services/api';

const CASE_TYPES = [
  "Civil",
  "Criminal",
  "Family",
  "Property",
  "Consumer",
  "Labor",
  "Tax",
  "Corporate",
  "Other",
];

export default function CaseScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "analyze" | "upload" | "history" | "procedure"
  >("analyze");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseType, setCaseType] = useState("Civil");
  const [caseDescription, setCaseDescription] = useState("");
  const [language, setLanguage] = useState<"english" | "hinglish">("english");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [procedure, setProcedure] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const analyzeCase = async () => {
    if (!caseTitle || !caseDescription) {
      showAlert(
        "Missing Information",
        "Please fill in both the case title and description.",
      );
      return;
    }

    setLoading(true);
    setAnalysis(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const formData = new FormData();
      formData.append("user_id", user?.id || "");
      formData.append("case_title", caseTitle);
      formData.append("case_type", caseType);
      formData.append("case_description", caseDescription);
      formData.append("language", language);

      const response = await api.post('/case/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setAnalysis(response.data);
      setCaseTitle("");
      setCaseDescription("");
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        showAlert(
          "Taking Too Long",
          "The analysis is taking longer than expected. Please try again with a shorter description.",
        );
      } else {
        showAlert(
          "Analysis Failed",
          error.response?.data?.detail || "Could not connect to the server. Please check your internet connection.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "text/plain"],
      });
      if (!result.canceled && result.assets?.[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      showAlert("Error", "Failed to pick document");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setSelectedFile({ ...result.assets[0], type: "image" });
      }
    } catch (error) {
      showAlert("Error", "Failed to pick image");
    }
  };

  const analyzeDocument = async () => {
    if (!selectedFile) {
      showAlert("No Document", "Please select a document to analyze.");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const formData = new FormData();
      formData.append("user_id", user?.id || "");

      if (selectedFile.type === "image" && selectedFile.base64) {
        formData.append("document_type", "image");
        formData.append(
          "file_content",
          `data:image/jpeg;base64,${selectedFile.base64}`,
        );
      } else if (selectedFile.uri) {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        formData.append("document_type", "pdf");
        formData.append(
          "file_content",
          `data:application/pdf;base64,${base64}`,
        );
      }

      const response = await api.post('/case/analyze-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setAnalysis(response.data);
      setSelectedFile(null);
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        showAlert(
          "Taking Too Long",
          "Document analysis timed out. Please try again.",
        );
      } else {
        showAlert("Analysis Failed", error.response?.data?.detail || "Could not connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!user?.id) return;
    try {
      const response = await api.get(`/case/history/${user.id}`);
      setHistory(response.data);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const loadProcedure = async () => {
    setLoading(true);
    setProcedure(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await api.get(`/procedure/${caseType}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setProcedure(response.data);
    } catch (error: any) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        showAlert("Timeout", "Loading procedure took too long.");
      } else {
        showAlert("Error", error.response?.data?.detail || "Could not connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  const openCaseDetail = (caseItem: any) => {
    router.push({
      pathname: "/case-detail",
      params: { caseId: caseItem.id, caseTitle: caseItem.case_title },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <AnalysisLoader isVisible={loading} estimatedTime={30} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Case Analysis</Text>
        <Text style={styles.headerSubtitle}>
          Get insights, strategy & loopholes
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabScrollContent}
      >
        {(["analyze", "upload", "procedure", "history"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            testID={`tab-${tab}`}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={
                tab === "analyze"
                  ? "analytics"
                  : tab === "upload"
                    ? "cloud-upload"
                    : tab === "procedure"
                      ? "list"
                      : "time"
              }
              size={16}
              color={activeTab === tab ? "#10B981" : "#6B7280"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab === "analyze"
                ? "Analyze"
                : tab === "upload"
                  ? "Upload Docs"
                  : tab === "procedure"
                    ? "Procedure"
                    : "History"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "analyze" && (
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Case Title *</Text>
              <TextInput
                testID="case-title-input"
                style={styles.input}
                placeholder="e.g., Property Dispute with Neighbor"
                value={caseTitle}
                onChangeText={setCaseTitle}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Case Type *</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  testID="case-type-picker"
                  selectedValue={caseType}
                  onValueChange={setCaseType}
                  style={styles.picker}
                >
                  {CASE_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Case Description *</Text>
              <TextInput
                testID="case-description-input"
                style={[styles.input, styles.textArea]}
                placeholder="Describe your case in detail. Include dates, parties involved, what happened, and what you want to achieve..."
                value={caseDescription}
                onChangeText={setCaseDescription}
                multiline
                numberOfLines={8}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.languageToggle}>
              <Text style={styles.label}>Response Language</Text>
              <View style={styles.langButtons}>
                <TouchableOpacity
                  testID="lang-english"
                  style={[
                    styles.langBtn,
                    language === "english" && styles.langBtnActive,
                  ]}
                  onPress={() => setLanguage("english")}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      language === "english" && styles.langBtnTextActive,
                    ]}
                  >
                    English
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="lang-hinglish"
                  style={[
                    styles.langBtn,
                    language === "hinglish" && styles.langBtnActive,
                  ]}
                  onPress={() => setLanguage("hinglish")}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      language === "hinglish" && styles.langBtnTextActive,
                    ]}
                  >
                    Hinglish
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              testID="analyze-case-btn"
              style={styles.analyzeButton}
              onPress={analyzeCase}
              disabled={loading}
            >
              <Ionicons name="analytics" size={20} color="#fff" />
              <Text style={styles.analyzeButtonText}>Analyze Case</Text>
            </TouchableOpacity>

            {analysis && !loading && (
              <View style={styles.resultSection}>
                <View style={styles.resultHeader}>
                  <Ionicons name="sparkles" size={20} color="#4F46E5" />
                  <Text style={styles.resultTitle}>Analysis Result</Text>
                  <TouchableOpacity
                    testID="view-detail-btn"
                    style={styles.viewDetailBtn}
                    onPress={() => openCaseDetail(analysis)}
                  >
                    <Text style={styles.viewDetailText}>Open Chat</Text>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={16}
                      color="#4F46E5"
                    />
                  </TouchableOpacity>
                </View>
                <AnalysisRenderer rawAnalysis={analysis.analysis} />
              </View>
            )}
          </View>
        )}

        {activeTab === "upload" && (
          <View>
            <View style={styles.uploadInfoCard}>
              <Ionicons name="information-circle" size={24} color="#2563EB" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.uploadInfoTitle}>
                  Upload Legal Documents
                </Text>
                <Text style={styles.uploadInfoText}>
                  Upload FIR, court orders, legal notices, or any case-related
                  documents. Our AI will automatically detect the case type and
                  analyze it.
                </Text>
              </View>
            </View>

            <View style={styles.uploadButtons}>
              <TouchableOpacity
                testID="pick-pdf-btn"
                style={styles.uploadButton}
                onPress={pickDocument}
              >
                <Ionicons name="document" size={32} color="#4F46E5" />
                <Text style={styles.uploadButtonTitle}>PDF / Document</Text>
                <Text style={styles.uploadButtonDesc}>
                  Court orders, FIR, notices
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="pick-image-btn"
                style={styles.uploadButton}
                onPress={pickImage}
              >
                <Ionicons name="camera" size={32} color="#10B981" />
                <Text style={styles.uploadButtonTitle}>Photo / Image</Text>
                <Text style={styles.uploadButtonDesc}>
                  Take a photo of document
                </Text>
              </TouchableOpacity>
            </View>

            {selectedFile && (
              <View style={styles.selectedFile}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.selectedFileText}>
                  {selectedFile.name || "Image selected"}
                </Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              testID="analyze-document-btn"
              style={[styles.analyzeButton, { backgroundColor: "#2563EB" }]}
              onPress={analyzeDocument}
              disabled={loading || !selectedFile}
            >
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.analyzeButtonText}>
                Auto-Analyze Document
              </Text>
            </TouchableOpacity>

            {analysis && !loading && (
              <View style={styles.resultSection}>
                <View style={styles.resultHeader}>
                  <Ionicons name="sparkles" size={20} color="#4F46E5" />
                  <Text style={styles.resultTitle}>
                    {analysis.case_title || "Document Analysis"}
                  </Text>
                </View>
                <View style={styles.detectedBadge}>
                  <Text style={styles.detectedBadgeText}>
                    Auto-detected: {analysis.case_type} Case
                  </Text>
                </View>
                <AnalysisRenderer rawAnalysis={analysis.analysis} />
                <TouchableOpacity
                  testID="open-chat-from-upload-btn"
                  style={styles.openChatBtn}
                  onPress={() => openCaseDetail(analysis)}
                >
                  <Ionicons name="chatbubbles" size={18} color="#fff" />
                  <Text style={styles.openChatBtnText}>Continue in Chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === "procedure" && (
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Case Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={caseType}
                  onValueChange={setCaseType}
                  style={styles.picker}
                >
                  {CASE_TYPES.map((type) => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              testID="load-procedure-btn"
              style={[styles.analyzeButton, { backgroundColor: "#F59E0B" }]}
              onPress={loadProcedure}
              disabled={loading}
            >
              <Ionicons name="list" size={20} color="#fff" />
              <Text style={styles.analyzeButtonText}>Load Procedure</Text>
            </TouchableOpacity>

            {procedure && !loading && (
              <View style={styles.resultSection}>
                <View style={styles.resultHeader}>
                  <Ionicons name="list" size={20} color="#F59E0B" />
                  <Text style={styles.resultTitle}>
                    {caseType} Case Procedure
                  </Text>
                </View>
                <AnalysisRenderer rawAnalysis={procedure.procedure} />
              </View>
            )}
          </View>
        )}

        {activeTab === "history" && (
          <View>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>No Case History</Text>
                <Text style={styles.emptyStateText}>
                  Analyze your first case to see it here
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  testID={`history-item-${item.id}`}
                  style={styles.historyCard}
                  onPress={() => openCaseDetail(item)}
                >
                  <View style={styles.historyIcon}>
                    <Ionicons name="briefcase" size={24} color="#10B981" />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{item.case_title}</Text>
                    <View style={styles.historyMeta}>
                      <View style={styles.historyBadge}>
                        <Text style={styles.historyBadgeText}>
                          {item.case_type}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleDateString("en-IN")}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  tabScroll: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    maxHeight: 50,
  },
  tabScrollContent: {
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#10B981",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },
  activeTabText: {
    color: "#10B981",
    fontWeight: "600",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: {
    height: 160,
    textAlignVertical: "top",
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  picker: {
    height: 52,
  },
  analyzeButton: {
    flexDirection: "row",
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  analyzeButtonText: {
    marginLeft: 8,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultSection: {
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 8,
    flex: 1,
  },
  viewDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
    marginRight: 4,
  },
  uploadInfoCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  uploadInfoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 4,
  },
  uploadInfoText: {
    fontSize: 13,
    color: "#3B82F6",
    lineHeight: 20,
  },
  uploadButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  uploadButton: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  uploadButtonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
  },
  uploadButtonDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  selectedFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  selectedFileText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#065F46",
  },
  detectedBadge: {
    backgroundColor: "#DBEAFE",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  detectedBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
  },
  openChatBtn: {
    flexDirection: "row",
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  openChatBtnText: {
    marginLeft: 8,
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  historyBadge: {
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#059669",
  },
  historyDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  languageToggle: {
    marginBottom: 20,
  },
  langButtons: {
    flexDirection: "row",
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    borderRadius: 12,
  },
  langBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  langBtnTextActive: {
    color: "#fff",
  },
});
