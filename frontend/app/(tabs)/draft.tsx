import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../../src/services/api'; 

export default function DraftScreen() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [formData, setFormData] = useState<any>({});
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [loading, setLoading] = useState(true);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  
  useEffect(()=> {
    const fetchTemplates = async()=> {
      try{
        const response = await api.get("/draft/templates");
        setTemplates(response.data);
      } catch(error) {
        console.error("Failed to fetch templates:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, [])
  
  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const response = await api.post("/draft/generate", {
        template_id: selectedTemplateId,
        user_inputs: formData,
      });
      setGeneratedDoc(response.data.content); 
    } catch (error) {
      console.error("Failed to generate draft:", error);
      Alert.alert("Error", "Failed to generate the document.");
    } finally {
      setLoading(false);
    }
  };

  // If loading initially, show a spinner
  if (loading && templates.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  // If a document was generated, show the result view
  if (generatedDoc) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Generated Document</Text>
          <Text style={styles.resultContent}>{generatedDoc}</Text>
        </View>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setGeneratedDoc("")}>
          <Text style={styles.secondaryButtonText}>Draft Another Document</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Legal Drafting</Text>
        <Text style={styles.headerSubtitle}>Select a template to auto-generate your document.</Text>

        <View style={styles.card}>
            <Text style={styles.label}>Document Type</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedTemplateId}
                    onValueChange={(itemValue) => {
                        setSelectedTemplateId(itemValue);
                        setFormData({}); // Reset form when changing templates
                    }}
                    style={styles.picker}
                >
                    <Picker.Item label="Select a template..." value="" color="#9CA3AF" />
                    {templates.map(t => (
                        <Picker.Item key={t.id} label={t.title} value={t.id} />
                    ))}
                </Picker>
            </View>
        </View>

        {selectedTemplate && (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Required Information</Text>
                {selectedTemplate.fields.map((field: any) => (
                    <View key={field.name} style={styles.inputGroup}>
                        <Text style={styles.label}>{field.label}</Text>
                        <TextInput 
                            style={styles.input}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            placeholderTextColor="#9CA3AF"
                            onChangeText={(text) => setFormData({...formData, [field.name]: text})}
                            value={formData[field.name] || ""}
                            keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                        />
                    </View>
                ))}

                <TouchableOpacity 
                    style={[styles.primaryButton, loading && styles.disabledButton]} 
                    onPress={handleGenerate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Generate Document</Text>
                    )}
                </TouchableOpacity>
            </View>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#F3F4F6', 
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B5563',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultContent: {
    fontSize: 16,
    lineHeight: 28,
    color: '#374151',
    textAlign: 'justify',
  }
});
