import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "../lib/constants";
import { getUserSession, clearUserSession, AuthUser } from "../lib/authStore";

interface AuditedAsset {
  id: string;
  assetId?: string;
  assetCode: string;
  assetName: string;
  conditionRating: string;
  operationalStatus: string;
  createdAt: string;
  servicedAt?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuditor, setIsAuditor] = useState(false);

  // Surveyor state
  const [scopedProperties, setScopedProperties] = useState<any[]>([]);

  // Auditor state
  const [auditedAssets, setAuditedAssets] = useState<AuditedAsset[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    try {
      const session = await getUserSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setUser(session);

      const userRole = session.role?.toLowerCase();

      if (userRole === "auditor") {
        setIsAuditor(true);
        await fetchAuditedAssets(session);
      } else {
        setIsAuditor(false);
        await fetchScopedHierarchy(session);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      router.replace("/login");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🟢 AUDITOR DATA FETCH
  const fetchAuditedAssets = async (currentUser?: AuthUser | null) => {
    try {
      const activeUser = currentUser || user;
      if (!activeUser?.id) return;

      const res = await fetch(
        `${API_BASE_URL}/api/auditor/logs?_t=${Date.now()}`,
        {
          headers: {
            "x-user-id": activeUser.id,
            "Cache-Control": "no-cache",
          },
        },
      );

      const json = await res.json();
      if (json.success) {
        setAuditedAssets(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch auditor logs:", err);
    }
  };

  // 🗑️ AUDITOR DELETE LOG HANDLER
  const handleDeleteAuditLog = (logId: string, assetName: string) => {
    Alert.alert(
      "Delete Audit Record",
      `Are you sure you want to delete the audit log for "${assetName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!user?.id) return;

              const res = await fetch(
                `${API_BASE_URL}/api/auditor/logs?id=${logId}`,
                {
                  method: "DELETE",
                  headers: {
                    "x-user-id": user.id,
                  },
                },
              );

              const json = await res.json();
              if (json.success) {
                // Optimistically update state
                setAuditedAssets((prev) =>
                  prev.filter((item) => item.id !== logId),
                );
              } else {
                Alert.alert(
                  "Error",
                  json.error || "Failed to delete audit record.",
                );
              }
            } catch (err) {
              console.error("Failed to delete log:", err);
              Alert.alert("Error", "Connection error while deleting record.");
            }
          },
        },
      ],
    );
  };

  // 🔵 SURVEYOR DATA FETCH
  const fetchScopedHierarchy = async (currentUser?: AuthUser | null) => {
    try {
      const activeUser = currentUser || user;
      if (!activeUser?.id) {
        handleLogout();
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/user-scopes?_t=${Date.now()}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-user-id": activeUser.id,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      );

      const json = await res.json();

      if (res.status === 401 || json.code === "ACCOUNT_DEACTIVATED") {
        Alert.alert(
          "Account Deactivated",
          "Your account has been deactivated by an administrator.",
        );
        handleLogout();
        return;
      }

      if (json.success) {
        setScopedProperties(json.data || []);
      }
    } catch (err) {
      console.error("Failed to connect to API:", err);
    }
  };

  const handleLogout = async () => {
    await clearUserSession();
    router.replace("/login");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isAuditor) {
      await fetchAuditedAssets();
    } else {
      await fetchScopedHierarchy();
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ marginTop: 12, color: "#64748b" }}>
          Connecting to AssetPulse API...
        </Text>
      </View>
    );
  }

  // 🟢 AUDITOR DASHBOARD VIEW
  if (isAuditor) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>
              Welcome, {user?.name || "Auditor"}
            </Text>
            <Text style={styles.roleText}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Scan Banner */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => router.push("/scan")}
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonText}>📷 Start Scanning QR</Text>
          </TouchableOpacity>
        </View>

        {/* Audited Asset History */}
        <Text style={styles.heading}>My Audited Asset Logs</Text>

        <FlatList
          data={auditedAssets}
          keyExtractor={(item, idx) => item.id || idx.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const rawDate = item.createdAt || item.servicedAt;
            const formattedDateTime = rawDate
              ? new Date(rawDate).toLocaleString([], {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "";

            return (
              <View style={styles.auditedCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.assetCode}>
                    {item.assetCode || "NO-CODE"}
                  </Text>
                  <View style={styles.statusGroup}>
                    <Text
                      style={[
                        styles.statusBadge,
                        item.operationalStatus === "OPERATIONAL"
                          ? styles.badgeOperational
                          : styles.badgeNonOperational,
                      ]}
                    >
                      {item.operationalStatus || "UNKNOWN"}
                    </Text>
                    {/* 🗑️ Delete Button */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() =>
                        handleDeleteAuditLog(item.id, item.assetName)
                      }
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.assetName}>{item.assetName}</Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.conditionText}>
                    Condition:{" "}
                    <Text style={styles.conditionVal}>
                      {item.conditionRating || "N/A"}
                    </Text>
                  </Text>
                  <Text style={styles.dateText}>{formattedDateTime}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No audited assets recorded yet. Tap above to scan a tag.
            </Text>
          }
        />
      </View>
    );
  }

  // 🔵 SURVEYOR DASHBOARD VIEW
  return (
    <View style={styles.container}>
      {/* User Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Welcome, {user?.name || "Surveyor"}
          </Text>
          <Text style={styles.roleText}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* 📋 Quick Action Banner */}
      <View style={styles.myAssetsBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Surveyed Assets</Text>
          <Text style={styles.bannerSub}>
            View, edit, or delete existing asset records.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.myAssetsBtn}
          onPress={() => router.push("/my-assets")}
        >
          <Text style={styles.myAssetsBtnText}>My Assets 📋</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.heading}>Select Assigned Location Scopes</Text>

      <FlatList
        data={scopedProperties}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item: property }) => (
          <View style={styles.card}>
            {/* Property Level */}
            {property.isPermitted ? (
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() =>
                  router.push({
                    pathname: "/survey",
                    params: {
                      propertyId: property.id,
                      propertyName: property.name,
                    },
                  })
                }
              >
                <Text style={styles.propertyName}>🏢 {property.name}</Text>
                <Text style={styles.badge}>Wave {property.wave}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cardHeader}>
                <Text style={[styles.propertyName, { color: "#94a3b8" }]}>
                  🏢 {property.name}
                </Text>
                <Text style={styles.badge}>Wave {property.wave}</Text>
              </View>
            )}

            <Text style={styles.propertyMeta}>
              Code: {property.code} • {property.city}
            </Text>

            {/* Hierarchy Scope */}
            <View style={styles.hierarchyContainer}>
              {property.buildings?.map((building: any) => (
                <View key={building.id} style={styles.buildingBlock}>
                  {building.isPermitted ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/survey",
                          params: {
                            propertyId: property.id,
                            buildingId: building.id,
                            propertyName: property.name,
                            buildingName: building.name,
                          },
                        })
                      }
                    >
                      <Text style={styles.buildingText}>
                        🏛️ {building.name}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.buildingText, { color: "#94a3b8" }]}>
                      🏛️ {building.name}
                    </Text>
                  )}

                  {building.floors?.map((floor: any) => (
                    <View key={floor.id} style={styles.floorBlock}>
                      {floor.isPermitted ? (
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: "/survey",
                              params: {
                                propertyId: property.id,
                                buildingId: building.id,
                                floorId: floor.id,
                                propertyName: property.name,
                                buildingName: building.name,
                                floorName: floor.name,
                              },
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.floorText,
                              { color: "#0284c7", fontWeight: "700" },
                            ]}
                          >
                            🚪 {floor.name}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.floorText, { color: "#94a3b8" }]}>
                          🚪 {floor.name}
                        </Text>
                      )}

                      <View style={styles.roomContainer}>
                        {floor.rooms?.map((room: any) =>
                          room.isPermitted ? (
                            <TouchableOpacity
                              key={room.id}
                              style={styles.roomChip}
                              onPress={() =>
                                router.push({
                                  pathname: "/survey",
                                  params: {
                                    propertyId: property.id,
                                    buildingId: building.id,
                                    floorId: floor.id,
                                    roomId: room.id,
                                    propertyName: property.name,
                                    buildingName: building.name,
                                    floorName: floor.name,
                                    roomName: room.name,
                                  },
                                })
                              }
                            >
                              <Text style={styles.roomText}>
                                📍 {room.name}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View
                              key={room.id}
                              style={[
                                styles.roomChip,
                                {
                                  backgroundColor: "#f8fafc",
                                  borderColor: "#f1f5f9",
                                },
                              ]}
                            >
                              <Text
                                style={[styles.roomText, { color: "#cbd5e1" }]}
                              >
                                📍 {room.name}
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No assigned location scopes found.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  welcomeText: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  roleText: { fontSize: 12, color: "#64748b" },
  logoutButton: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: { color: "#dc2626", fontSize: 12, fontWeight: "bold" },

  // Auditor Banner
  heroSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  scanButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  scanButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },

  // Auditor Card
  auditedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#fee2e2",
    borderRadius: 4,
  },
  deleteBtnText: {
    fontSize: 12,
  },
  assetCode: {
    fontSize: 13,
    color: "#0284c7",
    fontWeight: "bold",
    fontFamily: "monospace",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: "hidden",
  },
  badgeOperational: { backgroundColor: "#dcfce7", color: "#166534" },
  badgeNonOperational: { backgroundColor: "#fee2e2", color: "#991b1b" },
  assetName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginVertical: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  conditionText: { fontSize: 12, color: "#64748b" },
  conditionVal: { fontWeight: "bold", color: "#0f172a" },
  dateText: { fontSize: 11, color: "#94a3b8" },

  // Surveyor Banner Styles
  myAssetsBanner: {
    backgroundColor: "#0284c7",
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bannerTitle: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  bannerSub: { color: "#e0f2fe", fontSize: 11, marginTop: 2 },
  myAssetsBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  myAssetsBtnText: { color: "#0284c7", fontWeight: "bold", fontSize: 13 },

  heading: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#0f172a",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  propertyName: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  badge: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  propertyMeta: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 8,
  },
  hierarchyContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  buildingBlock: { marginTop: 6, paddingLeft: 4 },
  buildingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0284c7",
    marginVertical: 2,
  },
  floorBlock: { marginTop: 4, paddingLeft: 12 },
  floorText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    marginVertical: 2,
  },
  roomContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
    paddingLeft: 12,
  },
  roomChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  roomText: { fontSize: 11, color: "#334155", fontWeight: "500" },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 24,
    fontSize: 14,
  },
});
