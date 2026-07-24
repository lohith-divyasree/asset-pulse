import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  TouchableOpacity,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { getUserSession, clearUserSession } from "../lib/authStore";

export default function AuditorScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    // Enable re-scanning when screen gains focus
    setScanned(false);
  }, []);

  const handleLogout = async () => {
    await clearUserSession();
    router.replace("/login");
  };

  const handleGoHome = () => {
    router.replace("/");
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.message}>
          Camera permission is required to scan asset QR codes.
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Parse the QR code value or URL parameter
    let payload = data;
    if (data.includes("/scan/")) {
      payload = data.split("/scan/").pop() || data;
    } else if (data.includes("/asset/")) {
      payload = data.split("/asset/").pop() || data;
    }

    // 🟢 Navigate directly to the audit form with the payload parameter
    router.push({
      pathname: "/audit",
      params: { qrPayload: payload },
    });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome}>
            <Text style={styles.homeBtnText}>🏠 Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.targetContainer}>
          <Text style={styles.instructionText}>
            Align Asset QR Code inside frame
          </Text>
          <View style={styles.qrTargetBox} />
        </View>

        {/* 🟢 Return to Home Screen */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleGoHome}>
          <Text style={styles.actionBtnText}>Back to Dashboard 🏠</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 16,
    color: "#334155",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "space-between",
    paddingVertical: 40,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  homeBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  homeBtnText: { color: "#ffffff", fontSize: 13, fontWeight: "bold" },
  logoutBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: { color: "#dc2626", fontSize: 12, fontWeight: "bold" },
  targetContainer: { alignItems: "center" },
  instructionText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 20,
  },
  qrTargetBox: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#38bdf8",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  actionBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    marginHorizontal: 40,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
});
