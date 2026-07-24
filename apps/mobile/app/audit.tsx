import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "../lib/constants";
import { getUserSession } from "../lib/authStore";

export default function AuditScreen() {
  const router = useRouter();
  const { qrPayload } = useLocalSearchParams<{ qrPayload: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");

  // Form Fields
  const [conditionRating, setConditionRating] = useState<
    "1" | "2" | "3" | "4" | "5"
  >("3");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchAssetAndUser();
  }, [qrPayload]);

  const fetchAssetAndUser = async () => {
    try {
      const user = await getUserSession();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      // Fetch asset details using the scanned payload
      const res = await fetch(`${API_BASE_URL}/api/assets/${qrPayload}`, {
        headers: { "x-user-id": user.id },
      });
      const json = await res.json();

      if (json.success && json.data) {
        setAsset(json.data);
        if (json.data.conditionRating) {
          setConditionRating(String(json.data.conditionRating) as any);
        }
      } else {
        Alert.alert("Not Found", "No asset matching this QR code was found.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Alert.alert("Error", "Unable to fetch asset details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAudit = async () => {
    if (!asset?.id) return;

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/api/audit/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          assetId: asset.id,
          conditionRating,
          notes,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        Alert.alert("Success", "Audit report submitted successfully!", [
          { text: "Scan Next", onPress: () => router.replace("/scan") },
        ]);
      } else {
        Alert.alert("Error", json.error || "Failed to submit audit report.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ marginTop: 12, color: "#64748b" }}>
          Fetching asset details...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Asset Information */}
      <View style={styles.card}>
        <Text style={styles.assetName}>{asset?.assetName}</Text>
        <Text style={styles.assetCode}>Code: {asset?.assetCode || "N/A"}</Text>
        <Text style={styles.metaText}>
          Make: {asset?.make || "N/A"} • Model: {asset?.modelNumber || "N/A"}
        </Text>
        <Text style={styles.metaText}>
          Serial: {asset?.serialNumber || "N/A"}
        </Text>
      </View>

      {/* Condition Rating Selector */}
      <Text style={styles.label}>
        Condition Rating (1 = Poor, 5 = Excellent)
      </Text>
      <View style={styles.chipRow}>
        {["1", "2", "3", "4", "5"].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.chip,
              conditionRating === rating && styles.chipActive,
            ]}
            onPress={() => setConditionRating(rating as any)}
          >
            <Text
              style={[
                styles.chipText,
                conditionRating === rating && styles.chipTextActive,
              ]}
            >
              {rating} ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Auditor Notes */}
      <Text style={styles.label}>Auditor Observations & Notes</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
        placeholder="Enter maintenance observations or defect notes..."
        placeholderTextColor="#94a3b8"
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
        onPress={handleSubmitAudit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Audit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  assetName: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  assetCode: {
    fontSize: 13,
    color: "#0284c7",
    fontWeight: "600",
    marginTop: 2,
  },
  metaText: { fontSize: 12, color: "#64748b", marginTop: 4 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginTop: 12,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
  },
  chipActive: { backgroundColor: "#0284c7" },
  chipText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  chipTextActive: { color: "#ffffff" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14,
    minHeight: 100,
  },
  submitBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  submitBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 16 },
});
