import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { getUserSession, AuthUser } from '../lib/authStore';
import { API_BASE_URL } from '../lib/constants';

export default function MyAssetsScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for displaying QR Code Modal
  const [selectedQr, setSelectedQr] = useState<{
    assetName: string;
    assetCode: string;
    qrPayload: string;
  } | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    const user = await getUserSession();
    if (!user) {
      router.replace('/login');
      return;
    }
    setCurrentUser(user);

    try {
      const res = await fetch(`${API_BASE_URL}/api/assets`, {
        headers: { 'x-user-id': user.id },
      });
      const result = await res.json();

      if (result.success) {
        const userOnlyAssets = result.data.filter((a: any) => a.surveyorId === user.id);
        setMyAssets(userOnlyAssets);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch your surveyed assets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (assetId: string, assetName: string) => {
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete "${assetName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/assets/${assetId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': currentUser?.id || '' },
              });
              const result = await res.json();

              if (result.success) {
                setMyAssets((prev) => prev.filter((a) => a.id !== assetId));
                Alert.alert('Success', 'Asset deleted.');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete asset.');
              }
            } catch (err) {
              Alert.alert('Error', 'Network error during deletion.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Surveyed Assets</Text>
        <TouchableOpacity
          style={styles.newSurveyHeaderBtn}
          onPress={() => router.push('/')}
        >
          <Text style={styles.newSurveyHeaderBtnText}>+ Scope Select</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myAssets}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAssets();
            }}
          />
        }
        renderItem={({ item }) => {
          const qrPayload = item.qrCode || `assetpulse://asset/${item.id}`;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.assetName}>{item.assetName}</Text>
                  <Text style={styles.assetCode}>{item.assetCode || 'Draft'}</Text>
                </View>
                <Text style={styles.badge}>{item.operationalStatus}</Text>
              </View>

              <Text style={styles.metaText}>
                Make: {item.make || 'N/A'} • Score: {item.completionScore}%
              </Text>

              {/* 🟢 Display UpdatedAt Timestamp */}
              <Text style={styles.updatedAtText}>
                Updated: {formatDate(item.updatedAt || item.surveyedAt)}
              </Text>

              <View style={styles.actionRow}>
                {/* 🟢 QR Code Trigger Button */}
                <TouchableOpacity
                  style={[styles.btn, styles.qrBtn]}
                  onPress={() =>
                    setSelectedQr({
                      assetName: item.assetName,
                      assetCode: item.assetCode || 'N/A',
                      qrPayload,
                    })
                  }
                >
                  <Text style={[styles.btnText, { color: '#0f172a' }]}>📷 QR</Text>
                </TouchableOpacity>

                {/* Edit Button */}
                <TouchableOpacity
                  style={[styles.btn, styles.editBtn]}
                  onPress={() =>
                    router.push({
                      pathname: '/survey',
                      params: { editAssetId: item.id },
                    })
                  }
                >
                  <Text style={styles.btnText}>✏️ Edit</Text>
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity
                  style={[styles.btn, styles.deleteBtn]}
                  onPress={() => handleDelete(item.id, item.assetName)}
                >
                  <Text style={[styles.btnText, { color: '#ef4444' }]}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't surveyed any assets yet.</Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/')}
            >
              <Text style={styles.emptyActionBtnText}>Start New Survey</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 🟢 Modal for displaying QR Code */}
      <Modal visible={Boolean(selectedQr)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedQr?.assetName}</Text>
            <Text style={styles.modalSubtitle}>Code: {selectedQr?.assetCode}</Text>

            <View style={styles.qrContainer}>
              {selectedQr?.qrPayload && (
                <QRCode
                  value={selectedQr.qrPayload}
                  size={190}
                  color="#0f172a"
                  backgroundColor="#ffffff"
                />
              )}
            </View>

            <Text style={styles.payloadText}>{selectedQr?.qrPayload}</Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedQr(null)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  backBtn: { backgroundColor: '#e2e8f0', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  backBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  newSurveyHeaderBtn: { backgroundColor: '#0284c7', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  newSurveyHeaderBtnText: { fontSize: 12, fontWeight: 'bold', color: '#ffffff' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  assetName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  assetCode: { fontSize: 12, color: '#64748b' },
  badge: { backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, fontWeight: '600', textTransform: 'capitalize' },
  metaText: { fontSize: 13, color: '#475569', marginTop: 6 },
  updatedAtText: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  btn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1 },
  qrBtn: { borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' },
  editBtn: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  deleteBtn: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  btnText: { fontSize: 12, fontWeight: '600', color: '#0284c7' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  emptyActionBtn: { marginTop: 12, backgroundColor: '#0284c7', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  emptyActionBtnText: { color: '#ffffff', fontWeight: 'bold' },
  
  // Modal Styling
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, alignItems: 'center', width: '82%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  modalSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 16, marginTop: 2 },
  qrContainer: { padding: 12, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  payloadText: { fontSize: 11, color: '#64748b', marginBottom: 16, fontFamily: 'Platform' },
  closeBtn: { backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 28, borderRadius: 6 },
  closeBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});