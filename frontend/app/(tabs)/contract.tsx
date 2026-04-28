import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { showAlert } from "@/utils/alert";
import api from '../../src/services/api';

export default function ContractScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"analyze" | "history">("analyze");
  const [textInput, setTextInput] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "text/plain"],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file);
        setDocumentName(file.name);
        showAlert("Success", "Document selected");
      }
    } catch (error) {
      console.error("Error picking document:", error);
      showAlert("Error", "Failed to pick document");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const image = result.assets[0];
        setSelectedFile({
          ...image,
          type: "image",
        });
        setDocumentName("Image_" + Date.now());
        showAlert("Success", "Image selected");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert("Error", "Failed to pick image");
    }
  };

  const analyzeContract = async () => {
    if (!documentName) {
      showAlert("Error", "Please provide a document name");
      return;
    }

    if (!textInput && !selectedFile) {
      showAlert("Error", "Please provide text or select a document");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("user_id", user?.id || "");
      formData.append("document_name", documentName);

      if (textInput) {
        formData.append("document_type", "text");
        formData.append("text_content", textInput);
      } else if (selectedFile) {
        let fileContent = "";

        if (selectedFile.type === "image" && selectedFile.base64) {
          formData.append("document_type", "image");
          fileContent = `data:image/jpeg;base64,${selectedFile.base64}`;
        } else if (selectedFile.uri) {
          // Modern standard web API approach to replace deprecated FileSystem method
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
          fileContent = `data:application/pdf;base64,${base64}`;
        }

        formData.append("file_content", fileContent);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await api.post('/contract/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setAnalysis(response.data);
      showAlert("Success", "Contract analyzed successfully");
      setTextInput("");
      setSelectedFile(null);
      setDocumentName("");
    } catch (error: any) {
      console.error("Error analyzing contract:", error);
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        showAlert("Timeout", "Analysis is taking too long. Please try again.");
      } else {
        showAlert("Error", error.response?.data?.detail || "Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await api.get(`/contract/history/${user.id}`);
      setHistory(response.data);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contract Analysis</Text>
        <Text style={styles.headerSubtitle}>Simplify legal documents</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "analyze" && styles.activeTab]}
          onPress={() => setActiveTab("analyze")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "analyze" && styles.activeTabText,
            ]}
          >
            Analyze
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "analyze" ? (
          <View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Document Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Rental Agreement"
                value={documentName}
                onChangeText={setDocumentName}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Paste Text or Upload Document</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Paste contract text here..."
                value={textInput}
                onChangeText={setTextInput}
                multiline
                numberOfLines={6}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.uploadButtons}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickDocument}
              >
                <Ionicons name="document" size={24} color="#4F46E5" />
                <Text style={styles.uploadButtonText}>Pick PDF/Doc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Ionicons name="image" size={24} color="#4F46E5" />
                <Text style={styles.uploadButtonText}>Pick Image</Text>
              </TouchableOpacity>
            </View>

            {selectedFile && (
              <View style={styles.selectedFile}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.selectedFileText}>
                  {selectedFile.name || "Image selected"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={analyzeContract}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.analyzeButtonText}>Analyze Contract</Text>
                </>
              )}
            </TouchableOpacity>

            {analysis && (
              <View style={styles.analysisCard}>
                <Text style={styles.analysisTitle}>Analysis Result</Text>
                <View style={styles.analysisContent}>
                  <Text style={styles.analysisLabel}>Simplified Version:</Text>
                  <Text style={styles.analysisText}>
                    {analysis.simplified_text}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View>
            {loading ? (
              <ActivityIndicator
                size="large"
                color="#4F46E5"
                style={{ marginTop: 40 }}
              />
            ) : history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={64}
                  color="#D1D5DB"
                />
                <Text style={styles.emptyStateText}>
                  No contract analysis history
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyCard}
                  onPress={() => setAnalysis(item)}
                >
                  <View style={styles.historyHeader}>
                    <Ionicons name="document-text" size={24} color="#4F46E5" />
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle}>
                        {item.document_name}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#4F46E5",
  },
  tabText: {
    fontSize: 16,
    color: "#6B7280",
  },
  activeTabText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  content: {
    padding: 20,
  },
  inputContainer: {
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
    height: 120,
    textAlignVertical: "top",
  },
  uploadButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  uploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
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
    marginLeft: 8,
    fontSize: 14,
    color: "#065F46",
  },
  analyzeButton: {
    flexDirection: "row",
    backgroundColor: "#4F46E5",
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
  analysisCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  analysisContent: {
    marginBottom: 16,
  },
  analysisLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 16,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyInfo: {
    marginLeft: 12,
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  historyDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});
