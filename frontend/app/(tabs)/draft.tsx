import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { showAlert } from "@/utils/alert";
import {
  checkPdfWorkerHealth,
  waitForPdfWorker,
  getPdfWorkerUrl,
} from "../../src/services/pdfWorkerHealthCheck";

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─── Draft types and their input fields ───────────────────────────
const DRAFT_TYPES = [
  {
    key: "vakalatnama",
    label: "Vakalatnama",
    labelHi: "वकालतनामा",
    icon: "document-text",
    color: "#4F46E5",
    fields: [
      {
        key: "client_name",
        label: "Client Full Name",
        placeholder: "e.g. Ramesh Kumar Singh",
      },
      {
        key: "client_father_name",
        label: "Client Father's/Husband's Name",
        placeholder: "e.g. S/o Suresh Kumar Singh",
      },
      { key: "client_age", label: "Client Age", placeholder: "e.g. 45" },
      {
        key: "client_address",
        label: "Client Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "party_type",
        label: "Party Type",
        placeholder: "e.g. Plaintiff / Defendant / Petitioner / Respondent",
      },
      {
        key: "lawyer_name",
        label: "Advocate Full Name",
        placeholder: "e.g. Adv. Suresh Sharma",
      },
      {
        key: "lawyer_address",
        label: "Advocate Chamber/Address",
        placeholder: "e.g. Chamber 104, District Court",
      },
      {
        key: "bar_council_number",
        label: "Bar Council Enrollment No.",
        placeholder: "e.g. U.P./123/2015",
      },
      {
        key: "court_name",
        label: "Court Name",
        placeholder: "e.g. District Court, Lucknow",
      },
      {
        key: "case_number",
        label: "Case Number",
        placeholder: "e.g. Civil Suit No. 45/2024",
      },
      {
        key: "case_type",
        label: "Type of Case",
        placeholder: "e.g. Civil / Criminal / Family",
      },
    ],
  },
  {
    key: "bail_application",
    label: "Bail Application",
    labelHi: "जमानत आवेदन",
    icon: "shield-checkmark",
    color: "#10B981",
    fields: [
      {
        key: "accused_name",
        label: "Accused Full Name",
        placeholder: "e.g. Mohan Lal Verma",
      },
      {
        key: "accused_father_name",
        label: "Accused Father's Name",
        placeholder: "e.g. S/o Ram Lal Verma",
      },
      { key: "accused_age", label: "Accused Age", placeholder: "e.g. 32" },
      {
        key: "accused_address",
        label: "Accused Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "complainant_name",
        label: "Informant / Complainant Name",
        placeholder: "State / e.g. Amit Kumar",
      },
      {
        key: "fir_number",
        label: "FIR Number",
        placeholder: "e.g. FIR No. 234/2024",
      },
      {
        key: "sections",
        label: "Sections Applied",
        placeholder: "e.g. IPC 302, 307",
      },
      {
        key: "police_station",
        label: "Police Station",
        placeholder: "e.g. Hazratganj, Lucknow",
      },
      {
        key: "court_name",
        label: "Court Name",
        placeholder: "e.g. Sessions Court, Lucknow",
      },
      {
        key: "lawyer_name",
        label: "Advocate's Name",
        placeholder: "e.g. Adv. Priya Gupta",
      },
      {
        key: "grounds",
        label: "Key Grounds for Bail",
        placeholder:
          "e.g. first offender, family dependents, cooperating with investigation",
        multiline: true,
      },
    ],
  },
  {
    key: "legal_notice",
    label: "Legal Notice",
    labelHi: "कानूनी नोटिस",
    icon: "mail",
    color: "#F59E0B",
    fields: [
      {
        key: "sender_name",
        label: "Client / Sender Name",
        placeholder: "e.g. Anjali Srivastava",
      },
      {
        key: "sender_father_name",
        label: "Sender Father's/Husband's Name",
        placeholder: "e.g. D/o Ramakant Srivastava",
      },
      {
        key: "sender_address",
        label: "Sender Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "receiver_name",
        label: "Receiver / Opposite Party",
        placeholder: "e.g. XYZ Builders Pvt. Ltd.",
      },
      {
        key: "receiver_address",
        label: "Receiver Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "subject",
        label: "Subject of Notice",
        placeholder: "e.g. Non-payment of dues, Property dispute",
      },
      {
        key: "details",
        label: "Facts & Details",
        placeholder: "Explain the issue in detail",
        multiline: true,
      },
      {
        key: "relief_sought",
        label: "Relief / Demand",
        placeholder: "e.g. Pay ₹2,50,000 within 15 days",
      },
      {
        key: "lawyer_name",
        label: "Advocate's Name",
        placeholder: "e.g. Adv. Rakesh Tiwari",
      },
      {
        key: "lawyer_address",
        label: "Advocate's Office Address",
        placeholder: "Full address for reply",
        multiline: true,
      },
    ],
  },
  {
    key: "affidavit",
    label: "Affidavit",
    labelHi: "शपथ पत्र",
    icon: "ribbon",
    color: "#8B5CF6",
    fields: [
      {
        key: "deponent_name",
        label: "Deponent Full Name",
        placeholder: "e.g. Sunita Devi",
      },
      {
        key: "deponent_father_name",
        label: "Father's/Husband's Name",
        placeholder: "e.g. W/o Rajesh Kumar",
      },
      { key: "age", label: "Age", placeholder: "e.g. 45" },
      {
        key: "religion_occupation",
        label: "Religion & Occupation",
        placeholder: "e.g. Hindu, Business",
      },
      {
        key: "address",
        label: "Full Address",
        placeholder: "Permanent address",
        multiline: true,
      },
      {
        key: "purpose",
        label: "Purpose of Affidavit",
        placeholder: "e.g. Name change, Property, Court submission",
      },
      {
        key: "content",
        label: "Facts to Declare",
        placeholder: "State the facts clearly",
        multiline: true,
      },
      {
        key: "court_name",
        label: "Court / Authority (if any)",
        placeholder: "e.g. District Court, Varanasi",
      },
    ],
  },
  {
    key: "mou",
    label: "MOU",
    labelHi: "समझौता ज्ञापन",
    icon: "handshake",
    color: "#EF4444",
    fields: [
      {
        key: "party1_name",
        label: "First Party Name",
        placeholder: "e.g. ABC Technologies Pvt. Ltd.",
      },
      {
        key: "party1_rep",
        label: "First Party Representative / Father's Name",
        placeholder: "e.g. Represented by Mr. Anil Jain",
      },
      {
        key: "party1_address",
        label: "First Party Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "party2_name",
        label: "Second Party Name",
        placeholder: "e.g. XYZ Solutions",
      },
      {
        key: "party2_rep",
        label: "Second Party Representative / Father's Name",
        placeholder: "e.g. Represented by Ms. Priya Sharma",
      },
      {
        key: "party2_address",
        label: "Second Party Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "execution_date",
        label: "Date of Execution",
        placeholder: "e.g. 15th May 2024",
      },
      {
        key: "jurisdiction",
        label: "Jurisdiction",
        placeholder: "e.g. Courts of New Delhi",
      },
      {
        key: "purpose",
        label: "Purpose / Objective",
        placeholder: "e.g. Software development collaboration",
      },
      {
        key: "terms",
        label: "Key Terms & Obligations",
        placeholder: "List the main terms",
        multiline: true,
      },
      {
        key: "duration",
        label: "Duration",
        placeholder: "e.g. 12 months from date of signing",
      },
    ],
  },
  {
    key: "power_of_attorney",
    label: "Power of Attorney",
    labelHi: "मुख्तारनामा",
    icon: "key",
    color: "#0EA5E9",
    fields: [
      {
        key: "grantor_name",
        label: "Principal/Grantor Full Name",
        placeholder: "Person giving power",
      },
      {
        key: "grantor_father_name",
        label: "Grantor's Father's/Husband's Name",
        placeholder: "e.g. S/o Mahesh Singh",
      },
      { key: "grantor_age", label: "Grantor Age", placeholder: "e.g. 50" },
      {
        key: "grantor_address",
        label: "Grantor Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "attorney_name",
        label: "Agent/Attorney Full Name",
        placeholder: "Person receiving power",
      },
      {
        key: "attorney_father_name",
        label: "Attorney's Father's/Husband's Name",
        placeholder: "e.g. S/o Rakesh Singh",
      },
      { key: "attorney_age", label: "Attorney Age", placeholder: "e.g. 30" },
      {
        key: "attorney_address",
        label: "Attorney Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "execution_date",
        label: "Date of Execution",
        placeholder: "e.g. 20th May 2024",
      },
      {
        key: "purpose",
        label: "Purpose",
        placeholder: "e.g. Property sale, Bank transactions",
      },
      {
        key: "powers",
        label: "Specific Powers Granted",
        placeholder: "List the powers",
        multiline: true,
      },
    ],
  },
  {
    key: "demand_letter",
    label: "Demand Letter",
    labelHi: "मांग पत्र",
    icon: "cash",
    color: "#F97316",
    fields: [
      {
        key: "sender_name",
        label: "Sender / Client Name",
        placeholder: "e.g. Vijay Kumar",
      },
      {
        key: "sender_address",
        label: "Sender Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "receiver_name",
        label: "Receiver Name",
        placeholder: "e.g. M/s ABC Company",
      },
      {
        key: "receiver_address",
        label: "Receiver Address",
        placeholder: "Full address",
        multiline: true,
      },
      {
        key: "amount",
        label: "Amount Demanded (if any)",
        placeholder: "e.g. ₹1,50,000",
      },
      {
        key: "details",
        label: "Background & Reason",
        placeholder: "Explain why the demand is being made",
        multiline: true,
      },
      {
        key: "deadline",
        label: "Response Deadline",
        placeholder: "e.g. 15 days from receipt",
      },
      {
        key: "lawyer_name",
        label: "Advocate's Name",
        placeholder: "e.g. Adv. Meera Singh",
      },
    ],
  },
];

// ─── PDF Worker Status Indicator ──────────────────────────────────
const PdfWorkerStatusBanner = ({
  status,
}: {
  status: "unknown" | "online" | "warming" | "offline";
}) => {
  if (status === "online" || status === "unknown") return null;

  const config = {
    warming: {
      backgroundColor: "#FEF3C7",
      borderColor: "#F59E0B",
      icon: "hourglass" as any,
      iconColor: "#F59E0B",
      text: "PDF Service Warming Up",
      subtext:
        "The PDF download feature is initializing (may take 10-30 seconds on first request)",
    },
    offline: {
      backgroundColor: "#FEE2E2",
      borderColor: "#EF4444",
      icon: "alert-circle" as any,
      iconColor: "#EF4444",
      text: "PDF Service Unavailable",
      subtext: "Document preview available, but PDF downloads may not work",
    },
  };

  const current = config[status];

  return (
    <View
      style={[
        styles.statusBanner,
        {
          backgroundColor: current.backgroundColor,
          borderColor: current.borderColor,
        },
      ]}
    >
      <Ionicons name={current.icon} size={16} color={current.iconColor} />
      <View style={styles.statusBannerText}>
        <Text style={[styles.statusBannerTitle, { color: current.iconColor }]}>
          {current.text}
        </Text>
        <Text
          style={[styles.statusBannerSubtext, { color: current.iconColor }]}
        >
          {current.subtext}
        </Text>
      </View>
    </View>
  );
};

// ─── Disclaimer component ──────────────────────────────────────────
const Disclaimer = () => (
  <View style={styles.disclaimer}>
    <Text style={styles.disclaimerText}>
      ⚠️ AI-generated content. Verify all citations and sections before use in
      legal proceedings.
    </Text>
  </View>
);

// ─── Main Component ────────────────────────────────────────────────
export default function DraftScreen() {
  const { user } = useAuth();

  const [step, setStep] = useState<"select" | "form" | "result">("select");
  const [selectedDraft, setSelectedDraft] = useState<
    (typeof DRAFT_TYPES)[0] | null
  >(null);
  const [language, setLanguage] = useState<"english" | "hindi">("english");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    content: string;
    pdf_base64: string;
  } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pdfWorkerStatus, setPdfWorkerStatus] = useState<
    "unknown" | "online" | "warming" | "offline"
  >("unknown");
  const [showWorkerWarning, setShowWorkerWarning] = useState(false);

  // Check PDF Worker health on component mount
  useEffect(() => {
    const checkWorkerStatus = async () => {
      const health = await checkPdfWorkerHealth();
      if (health.isOnline) {
        setPdfWorkerStatus("online");
      } else if (health.isWarmingUp) {
        setPdfWorkerStatus("warming");
        setShowWorkerWarning(true);
      } else {
        setPdfWorkerStatus("offline");
        setShowWorkerWarning(true);
      }
    };

    checkWorkerStatus();
  }, []);

  const handleSelectDraft = (draft: (typeof DRAFT_TYPES)[0]) => {
    setSelectedDraft(draft);
    setFormValues({});
    setStep("form");
  };

  const handleGenerate = async () => {
    if (!selectedDraft || !user) return;

    // Validate required fields
    const missing = selectedDraft.fields.filter(
      (f) => !formValues[f.key]?.trim(),
    );
    if (missing.length > 0) {
      showAlert(
        "Missing Fields",
        `Please fill: ${missing.map((f) => f.label).join(", ")}`,
      );
      return;
    }

    console.log("Starting generation with:", {
      draft_type: selectedDraft.key,
      language,
      user_id: user.id,
      pdf_worker_status: pdfWorkerStatus,
      inputs_count: Object.keys(formValues).length,
    });

    setLoading(true);

    try {
      // Check if PDF worker is online
      let workerReady = pdfWorkerStatus === "online";

      if (!workerReady) {
        console.log(
          "[Draft Generation] PDF Worker not ready, checking status...",
        );
        showAlert("Initializing", "PDF Worker is warming up. Please wait...");

        // Wait for PDF worker to come online (handle Render cold starts)
        workerReady = await waitForPdfWorker(3, 2000);

        if (!workerReady) {
          console.warn("[Draft Generation] PDF Worker failed to come online");
          setPdfWorkerStatus("offline");
          showAlert(
            "PDF Worker Unavailable",
            `The PDF generation service is currently unavailable (${getPdfWorkerUrl()}). Your document preview will be available, but PDF download may not work. Please try again in a moment.`,
          );
          // Continue anyway - at least the text content will be available
        } else {
          setPdfWorkerStatus("online");
          console.log("[Draft Generation] PDF Worker is now online");
        }
      }

      const response = await fetch(`${API_URL}/api/draft/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft_type: selectedDraft.key,
          language,
          inputs: formValues,
          user_id: user.id,
        }),
      });

      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        const err = JSON.parse(errorText);
        throw new Error(err.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data received:", {
        has_content: !!data.content,
        content_length: data.content?.length,
        has_pdf_base64: !!data.pdf_base64,
        pdf_base64_length: data.pdf_base64?.length,
      });

      if (!data.pdf_base64 || data.pdf_base64.trim() === "") {
        console.warn(
          "Warning: PDF base64 is empty - PDF Worker may not be responding",
        );
        setPdfWorkerStatus("offline");
        showAlert(
          "PDF Generation Failed",
          "PDF could not be generated, but your document preview is ready. The PDF service may be temporarily unavailable.",
        );
      } else {
        setPdfWorkerStatus("online");
      }

      setResult(data);
      setStep("result");
      showAlert("Success", "Draft generated successfully!");
    } catch (error: any) {
      console.error("Generation error:", error);
      showAlert(
        "Error",
        error.message || "Could not generate draft. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result?.pdf_base64) {
      showAlert("Error", "No PDF available to download");
      return;
    }

    if (Platform.OS === "web") {
      // Web download - more robust implementation
      try {
        console.log("Starting PDF download...");
        console.log("Base64 length:", result.pdf_base64.length);

        // Decode base64 to binary string
        let binaryString;
        try {
          binaryString = atob(result.pdf_base64);
        } catch (e) {
          console.error("Failed to decode base64:", e);
          showAlert("Error", "Invalid PDF data. Please try generating again.");
          return;
        }

        // Convert binary string to Uint8Array
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create blob
        const blob = new Blob([bytes], { type: "application/pdf" });
        console.log("Blob created:", blob.size, "bytes");

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedDraft?.key}_${Date.now()}.pdf`;
        link.style.display = "none";

        // Append to body, click, and remove
        document.body.appendChild(link);

        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          link.click();
          console.log("Download triggered");

          // Cleanup after a slight delay
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log("Cleanup completed");
          }, 100);
        }, 100);

        showAlert("Success", "PDF download started");
      } catch (error: any) {
        console.error("PDF download error:", error);
        showAlert(
          "Error",
          error.message || "Failed to download PDF. Please try again.",
        );
      }
    } else {
      // Native — use expo-file-system + expo-sharing
      try {
        const FileSystem = require("expo-file-system");
        const Sharing = require("expo-sharing");
        const path =
          FileSystem.documentDirectory +
          `${selectedDraft?.key}_${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(path, result.pdf_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(path, { mimeType: "application/pdf" });
      } catch (error: any) {
        console.error("Native download error:", error);
        showAlert(
          "Error",
          error.message || "Could not download on this device. Try on web.",
        );
      }
    }
  };

  const handleDownloadText = () => {
    if (!result?.content) return;
    if (Platform.OS === "web") {
      const blob = new Blob([result.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedDraft?.key}_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setStep("select");
    setSelectedDraft(null);
    setFormValues({});
    setResult(null);
  };

  // ── STEP 1: Select draft type ──────────────────────────────────
  if (step === "select") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <PdfWorkerStatusBanner status={pdfWorkerStatus} />

        <Text style={styles.screenTitle}>Legal Draft Generator</Text>
        <Text style={styles.screenSubtitle}>
          Generate court-ready documents instantly
        </Text>

        <View style={styles.grid}>
          {DRAFT_TYPES.map((draft) => (
            <TouchableOpacity
              key={draft.key}
              style={[styles.draftCard, { borderLeftColor: draft.color }]}
              onPress={() => handleSelectDraft(draft)}
            >
              <View
                style={[
                  styles.draftIcon,
                  { backgroundColor: draft.color + "20" },
                ]}
              >
                <Ionicons
                  name={draft.icon as any}
                  size={24}
                  color={draft.color}
                />
              </View>
              <View style={styles.draftCardText}>
                <Text style={styles.draftLabel}>{draft.label}</Text>
                <Text style={styles.draftLabelHi}>{draft.labelHi}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ── STEP 2: Fill form ─────────────────────────────────────────
  if (step === "form" && selectedDraft) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <PdfWorkerStatusBanner status={pdfWorkerStatus} />

        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep("select")}
        >
          <Ionicons name="arrow-back" size={20} color="#4F46E5" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.screenTitle}>{selectedDraft.label}</Text>
        <Text style={styles.screenSubtitle}>{selectedDraft.labelHi}</Text>

        {/* Language toggle */}
        <View style={styles.languageToggle}>
          <Text style={styles.languageLabel}>Document Language:</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                language === "english" && styles.toggleBtnActive,
              ]}
              onPress={() => setLanguage("english")}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  language === "english" && styles.toggleBtnTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                language === "hindi" && styles.toggleBtnActive,
              ]}
              onPress={() => setLanguage("hindi")}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  language === "hindi" && styles.toggleBtnTextActive,
                ]}
              >
                हिंदी
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form fields */}
        <View style={styles.form}>
          {selectedDraft.fields.map((field) => (
            <View key={field.key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <TextInput
                style={[styles.input, field.multiline && styles.inputMultiline]}
                placeholder={field.placeholder}
                placeholderTextColor="#9CA3AF"
                multiline={field.multiline}
                numberOfLines={field.multiline ? 4 : 1}
                value={formValues[field.key] || ""}
                onChangeText={(val) =>
                  setFormValues((prev) => ({ ...prev, [field.key]: val }))
                }
              />
            </View>
          ))}
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateBtnText}> Generating Draft...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>
              Generate {selectedDraft.label}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── STEP 3: Result ────────────────────────────────────────────
  if (step === "result" && result) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.resultHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleReset}>
            <Ionicons name="arrow-back" size={20} color="#4F46E5" />
            <Text style={styles.backText}>New Draft</Text>
          </TouchableOpacity>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.successText}>Generated</Text>
          </View>
        </View>

        <Text style={styles.screenTitle}>{selectedDraft?.label}</Text>
        <Text style={styles.resultLanguage}>
          Language: {language === "hindi" ? "हिंदी" : "English"}
        </Text>

        {/* Download buttons */}
        <View style={styles.downloadRow}>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleDownloadPDF}
          >
            <Ionicons name="document" size={18} color="#fff" />
            <Text style={styles.downloadBtnText}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.downloadBtn, styles.downloadBtnOutline]}
            onPress={handleDownloadText}
          >
            <Ionicons name="code-download" size={18} color="#4F46E5" />
            <Text style={[styles.downloadBtnText, { color: "#4F46E5" }]}>
              Download Text
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview toggle */}
        <TouchableOpacity
          style={styles.previewToggle}
          onPress={() => setPreviewVisible(!previewVisible)}
        >
          <Ionicons
            name={previewVisible ? "eye-off" : "eye"}
            size={18}
            color="#4F46E5"
          />
          <Text style={styles.previewToggleText}>
            {previewVisible ? "Hide Preview" : "Show Preview"}
          </Text>
        </TouchableOpacity>

        {/* Draft content preview */}
        {previewVisible && (
          <View style={styles.previewBox}>
            <ScrollView style={styles.previewScroll} nestedScrollEnabled>
              <Text style={styles.previewText}>{result.content}</Text>
            </ScrollView>
          </View>
        )}

        <Disclaimer />

        {/* Generate another */}
        <TouchableOpacity style={styles.anotherBtn} onPress={handleReset}>
          <Text style={styles.anotherBtnText}>Generate Another Draft</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Status banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  statusBannerText: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  statusBannerSubtext: {
    fontSize: 11,
    lineHeight: 14,
  },

  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    marginTop: 8,
  },
  screenSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
  },

  // Draft card grid
  grid: {
    gap: 10,
  },
  draftCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  draftIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  draftCardText: {
    flex: 1,
  },
  draftLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  draftLabelHi: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  // Back button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  backText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "500",
  },

  // Language toggle
  languageToggle: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  languageLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  toggleBtnTextActive: {
    color: "#fff",
  },

  // Form
  form: {
    gap: 14,
    marginBottom: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#111827",
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  // Generate button
  generateBtn: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Result
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  successText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "600",
  },
  resultLanguage: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
  },

  // Download buttons
  downloadRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 10,
  },
  downloadBtnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#4F46E5",
  },
  downloadBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Preview
  previewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  previewToggleText: {
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: "500",
  },
  previewBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    maxHeight: 400,
  },
  previewScroll: {
    flex: 1,
  },
  previewText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Disclaimer
  disclaimer: {
    marginVertical: 12,
    padding: 10,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  disclaimerText: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },

  // Another button
  anotherBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#4F46E5",
    alignItems: "center",
    marginTop: 8,
  },
  anotherBtnText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "600",
  },
});

// =============================================
// =============================================
// =============================================
// =============================================
// =============================================
// =============================================
// =============================================

// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
// import { Picker } from '@react-native-picker/picker';
// import api from '../../src/services/api';

// export default function DraftScreen() {
//   const [templates, setTemplates] = useState<any[]>([]);
//   const [selectedTemplateId, setSelectedTemplateId] = useState("");
//   const [formData, setFormData] = useState<any>({});
//   const [generatedDoc, setGeneratedDoc] = useState("");
//   const [loading, setLoading] = useState(true);

//   const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

//   useEffect(()=> {
//     const fetchTemplates = async()=> {
//       try{
//         const response = await api.get("/draft/templates");
//         setTemplates(response.data);
//       } catch(error) {
//         console.error("Failed to fetch templates:", error);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchTemplates();
//   }, [])

//   const handleGenerate = async () => {
//     if (!selectedTemplate) return;

//     setLoading(true);
//     try {
//       const response = await api.post("/draft/generate", {
//         template_id: selectedTemplateId,
//         user_inputs: formData,
//       });
//       setGeneratedDoc(response.data.content);
//     } catch (error) {
//       console.error("Failed to generate draft:", error);
//       showAlert("Error", "Failed to generate the document.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // If loading initially, show a spinner
//   if (loading && templates.length === 0) {
//     return (
//       <View style={styles.centerContainer}>
//         <ActivityIndicator size="large" color="#2563EB" />
//         <Text style={styles.loadingText}>Loading templates...</Text>
//       </View>
//     );
//   }

//   // If a document was generated, show the result view
//   if (generatedDoc) {
//     return (
//       <ScrollView contentContainerStyle={styles.container}>
//         <View style={styles.resultCard}>
//           <Text style={styles.resultTitle}>Generated Document</Text>
//           <Text style={styles.resultContent}>{generatedDoc}</Text>
//         </View>

//         <TouchableOpacity style={styles.secondaryButton} onPress={() => setGeneratedDoc("")}>
//           <Text style={styles.secondaryButtonText}>Draft Another Document</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     );
//   }

//   return (
//       <ScrollView contentContainerStyle={styles.container}>
//         <Text style={styles.headerTitle}>Legal Drafting</Text>
//         <Text style={styles.headerSubtitle}>Select a template to auto-generate your document.</Text>

//         <View style={styles.card}>
//             <Text style={styles.label}>Document Type</Text>
//             <View style={styles.pickerContainer}>
//                 <Picker
//                     selectedValue={selectedTemplateId}
//                     onValueChange={(itemValue) => {
//                         setSelectedTemplateId(itemValue);
//                         setFormData({}); // Reset form when changing templates
//                     }}
//                     style={styles.picker}
//                 >
//                     <Picker.Item label="Select a template..." value="" color="#9CA3AF" />
//                     {templates.map(t => (
//                         <Picker.Item key={t.id} label={t.title} value={t.id} />
//                     ))}
//                 </Picker>
//             </View>
//         </View>

//         {selectedTemplate && (
//             <View style={styles.card}>
//                 <Text style={styles.cardTitle}>Required Information</Text>
//                 {selectedTemplate.fields.map((field: any) => (
//                     <View key={field.name} style={styles.inputGroup}>
//                         <Text style={styles.label}>{field.label}</Text>
//                         <TextInput
//                             style={styles.input}
//                             placeholder={`Enter ${field.label.toLowerCase()}`}
//                             placeholderTextColor="#9CA3AF"
//                             onChangeText={(text) => setFormData({...formData, [field.name]: text})}
//                             value={formData[field.name] || ""}
//                             keyboardType={field.type === 'number' ? 'numeric' : 'default'}
//                         />
//                     </View>
//                 ))}

//                 <TouchableOpacity
//                     style={[styles.primaryButton, loading && styles.disabledButton]}
//                     onPress={handleGenerate}
//                     disabled={loading}
//                 >
//                     {loading ? (
//                         <ActivityIndicator color="#fff" />
//                     ) : (
//                         <Text style={styles.primaryButtonText}>Generate Document</Text>
//                     )}
//                 </TouchableOpacity>
//             </View>
//         )}
//       </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flexGrow: 1,
//     padding: 24,
//     backgroundColor: '#F3F4F6',
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#F3F4F6',
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#4B5563',
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 8,
//   },
//   headerSubtitle: {
//     fontSize: 16,
//     color: '#6B7280',
//     marginBottom: 24,
//   },
//   card: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: 20,
//     marginBottom: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#1F2937',
//     marginBottom: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//     paddingBottom: 12,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#374151',
//     marginBottom: 8,
//   },
//   pickerContainer: {
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 12,
//     backgroundColor: '#F9FAFB',
//     overflow: 'hidden',
//   },
//   picker: {
//     height: 50,
//     width: '100%',
//   },
//   inputGroup: {
//     marginBottom: 16,
//   },
//   input: {
//     height: 50,
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     fontSize: 16,
//     backgroundColor: '#F9FAFB',
//     color: '#1F2937',
//   },
//   primaryButton: {
//     backgroundColor: '#2563EB',
//     height: 54,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 12,
//     shadowColor: '#2563EB',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.2,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   disabledButton: {
//     backgroundColor: '#93C5FD',
//   },
//   primaryButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   secondaryButton: {
//     backgroundColor: '#FFFFFF',
//     height: 54,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 12,
//     borderWidth: 1,
//     borderColor: '#D1D5DB',
//   },
//   secondaryButtonText: {
//     color: '#374151',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   resultCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     padding: 24,
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   resultTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 16,
//     textAlign: 'center',
//   },
//   resultContent: {
//     fontSize: 16,
//     lineHeight: 28,
//     color: '#374151',
//     textAlign: 'justify',
//   }
// });
