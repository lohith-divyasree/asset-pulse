import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import { calculateCompletionScore } from "@asset-pulse/core";
import { offlineQueue } from "../lib/offlineQueue";
import { API_BASE_URL } from "../lib/constants";
import { getUserSession, clearUserSession, AuthUser } from "../lib/authStore";
import { useAuthCheck } from "@/hooks/useAuthCheck";

interface SpecFieldSchema {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  required?: boolean;
  options?: string[];
}

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  curatedMakes?: string[];
  specSchema?: SpecFieldSchema[];
}

export default function SurveyScreen() {
  const router = useRouter();

  // 1. ALL REACT HOOKS AT THE VERY TOP
  const { isChecking } = useAuthCheck();

  const {
    editAssetId,
    propertyId: passedPropertyId,
    propertyName: passedPropertyName,
    buildingId: passedBuildingId,
    buildingName: passedBuildingName,
    floorId: passedFloorId,
    floorName: passedFloorName,
    roomId: passedRoomId,
    roomName: passedRoomName,
  } = useLocalSearchParams<{
    editAssetId?: string;
    propertyId?: string;
    propertyName?: string;
    buildingId?: string;
    buildingName?: string;
    floorId?: string;
    floorName?: string;
    roomId?: string;
    roomName?: string;
  }>();

  const isEditMode = Boolean(editAssetId);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(isEditMode);

  // Scope Hierarchy state
  const [propertyId, setPropertyId] = useState(passedPropertyId || "");
  const [propertyName, setPropertyName] = useState(passedPropertyName || "");
  const [buildingId, setBuildingId] = useState(passedBuildingId || "");
  const [buildingName, setBuildingName] = useState(passedBuildingName || "");
  const [floorId, setFloorId] = useState(passedFloorId || "");
  const [floorName, setFloorName] = useState(passedFloorName || "");
  const [roomId, setRoomId] = useState(passedRoomId || "");
  const [roomName, setRoomName] = useState(passedRoomName || "");

  // Form States
  const [assetName, setAssetName] = useState("");
  const [make, setMake] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [gridReference, setGridReference] = useState("");
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Photo Upload States
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dynamic Specs & Curated Makes State
  const [specSchema, setSpecSchema] = useState<SpecFieldSchema[]>([]);
  const [specValues, setSpecValues] = useState<Record<string, any>>({});
  const [curatedMakes, setCuratedMakes] = useState<string[]>([]);

  // Enums
  const [criticality, setCriticality] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [operationalStatus, setOperationalStatus] = useState<
    "operative" | "inoperative"
  >("operative");
  const [conditionRating, setConditionRating] = useState<
    "1" | "2" | "3" | "4" | "5"
  >("3");

  // Categories Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<
    Subcategory[]
  >([]);
  const [loadingMetaData, setLoadingMetaData] = useState(true);

  // Selections
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");

  // Manual Category Overrides
  const [isManualCategory, setIsManualCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");

  // Post-Creation QR Code Modal State
  const [createdAssetQr, setCreatedAssetQr] = useState<{
    id: string;
    assetName: string;
    assetCode: string;
    qrCode: string;
  } | null>(null);

  // 2. HELPER FUNCTIONS DECLARED BEFORE USEEFFECT
  const handleDeactivationRedirect = async (message?: string) => {
    await clearUserSession();
    Alert.alert(
      "Session Invalid",
      message ||
        "Your account has been deactivated. Please contact an administrator.",
      [{ text: "OK", onPress: () => router.replace("/login") }],
    );
  };

  const fetchCategoriesAndSubcategories = async (): Promise<Subcategory[]> => {
    try {
      setLoadingMetaData(true);
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
        setSubcategories(data.subcategories || []);
        return data.subcategories || [];
      }
    } catch (err) {
      console.warn("Could not fetch categories, manual mode available:", err);
    } finally {
      setLoadingMetaData(false);
    }
    return [];
  };

  const loadExistingAsset = async (
    userId: string,
    loadedSubcats: Subcategory[],
  ) => {
    try {
      setLoadingAsset(true);
      const res = await fetch(`${API_BASE_URL}/api/assets/${editAssetId}`, {
        headers: { "x-user-id": userId },
      });
      const result = await res.json();

      if (result.success && result.data) {
        const asset = result.data;

        // Populate basic fields
        setAssetName(asset.assetName || "");
        setMake(asset.make || "");
        setModelNumber(asset.modelNumber || "");
        setSerialNumber(asset.serialNumber || "");
        setGridReference(asset.gridReference || "");
        setCriticality(asset.criticality || "medium");
        setOperationalStatus(asset.operationalStatus || "operative");
        setConditionRating(String(asset.conditionRating || "3") as any);
        setPhotoUrls(asset.photoUrls || []);

        if (asset.latitude && asset.longitude) {
          setCoords({
            latitude: Number(asset.latitude),
            longitude: Number(asset.longitude),
          });
        }

        // Scope Context
        setPropertyId(asset.propertyId || passedPropertyId || "");
        setBuildingId(asset.buildingId || passedBuildingId || "");
        setFloorId(asset.floorId || passedFloorId || "");
        setRoomId(asset.roomId || passedRoomId || "");

        // Category handling
        if (asset.isManualCategory) {
          setIsManualCategory(true);
          setCustomCategory(asset.customCategory || "");
          setCustomSubcategory(asset.customSubcategory || "");
        } else {
          setIsManualCategory(false);
          const catId = asset.categoryId ? String(asset.categoryId) : "";
          const subCatId = asset.subcategoryId
            ? String(asset.subcategoryId)
            : "";

          setSelectedCategoryId(catId);
          setSelectedSubcategoryId(subCatId);

          // Find full subcategory schema & curated makes for edit screen
          const matchingSubcat = loadedSubcats.find(
            (s) => String(s.id) === subCatId,
          );

          if (matchingSubcat) {
            setSpecSchema(matchingSubcat.specSchema || []);
            setCuratedMakes(matchingSubcat.curatedMakes || []);
          }

          setSpecValues(asset.specifications || asset.specData || {});
        }
      } else {
        Alert.alert("Error", result.error || "Failed to load asset details.");
        router.back();
      }
    } catch (err) {
      Alert.alert("Error", "Unable to fetch asset details.");
      router.back();
    } finally {
      setLoadingAsset(false);
    }
  };

  // 3. USEEFFECT HOOKS
  useEffect(() => {
    (async () => {
      const user = await getUserSession();
      if (!user) {
        handleDeactivationRedirect();
        return;
      }
      setCurrentUser(user);

      if (!isEditMode) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      }

      // Fetch metadata first and return loaded subcategories array
      const loadedSubcategories = await fetchCategoriesAndSubcategories();

      // Load existing asset details if in Edit Mode
      if (isEditMode) {
        await loadExistingAsset(user.id, loadedSubcategories);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      const filtered = subcategories.filter(
        (sub) => String(sub.categoryId) === String(selectedCategoryId),
      );
      setFilteredSubcategories(filtered);
    } else {
      setFilteredSubcategories([]);
    }
  }, [selectedCategoryId, subcategories]);

  // 4. ACTION HANDLERS
  const handleSelectSubcategory = (sub: Subcategory) => {
    setSelectedSubcategoryId(String(sub.id));
    setSpecSchema(sub.specSchema || []);
    setCuratedMakes(sub.curatedMakes || []);
  };

  const handleSpecFieldChange = (key: string, value: any) => {
    setSpecValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "Camera access is required to take asset photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setUploadingImage(true);

      const formData = new FormData();
      const filename = uri.split("/").pop() || "photo.jpg";

      formData.append("photo", {
        uri,
        name: filename,
        type: "image/jpeg",
      } as any);

      const headers: Record<string, string> = {};
      if (currentUser?.id) {
        headers["x-user-id"] = currentUser.id;
      }

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await response.json();

      if (response.status === 401 || data.code === "ACCOUNT_DEACTIVATED") {
        handleDeactivationRedirect(data.error);
        return;
      }

      if (data.success && data.url) {
        setPhotoUrls((prev) => [...prev, data.url]);
      } else {
        Alert.alert("Upload Failed", data.error || "Failed to upload photo.");
      }
    } catch (error) {
      Alert.alert(
        "Upload Error",
        "An error occurred while uploading the photo.",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const completionScore = calculateCompletionScore({
    assetName,
    make,
    modelNumber,
    serialNumber,
    specifications: specValues,
    latitude: coords?.latitude,
    longitude: coords?.longitude,
    photoUrls,
  });

  const handleSubmit = async () => {
    if (!assetName || !make) {
      Alert.alert("Missing Fields", "Asset Name and Make are required.");
      return;
    }

    if (!isManualCategory && (!selectedCategoryId || !selectedSubcategoryId)) {
      Alert.alert(
        "Missing Classification",
        "Please select both Category and Subcategory.",
      );
      return;
    }

    if (isManualCategory && (!customCategory || !customSubcategory)) {
      Alert.alert(
        "Missing Custom Fields",
        "Please enter both custom Category and Subcategory.",
      );
      return;
    }

    if (!propertyId) {
      Alert.alert("Missing Location", "No valid Property ID context provided.");
      return;
    }

    if (!currentUser?.id) {
      handleDeactivationRedirect("No active session found.");
      return;
    }

    const now = new Date().toISOString();

    const payload = {
      propertyId,
      buildingId: buildingId || null,
      floorId: floorId || null,
      roomId: roomId || null,
      assetName,
      make,
      modelNumber,
      serialNumber,
      gridReference,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      criticality,
      operationalStatus,
      conditionRating,
      completionScore,
      photoUrls,
      isManualCategory,
      categoryId: isManualCategory ? null : selectedCategoryId,
      subcategoryId: isManualCategory ? null : selectedSubcategoryId,
      customCategory: isManualCategory ? customCategory : undefined,
      customSubcategory: isManualCategory ? customSubcategory : undefined,
      specifications: specValues,
      updatedAt: now,
      ...(!isEditMode && { createdAt: now }),
    };

    const endpoint = isEditMode
      ? `${API_BASE_URL}/api/assets/${editAssetId}`
      : `${API_BASE_URL}/api/assets`;

    const httpMethod = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method: httpMethod,
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.status === 401 || result.code === "ACCOUNT_DEACTIVATED") {
        handleDeactivationRedirect(result.error);
        return;
      }

      if (response.ok && result.success) {
        if (isEditMode) {
          Alert.alert("Success!", "Asset updated successfully.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        } else {
          setCreatedAssetQr({
            id: result.data.id,
            assetName: result.data.assetName,
            assetCode: result.data.assetCode || "N/A",
            qrCode:
              result.data.qrCode || `assetpulse://asset/${result.data.id}`,
          });
        }
        return;
      } else {
        Alert.alert("Server Error", result.error || "Failed to save asset.");
        return;
      }
    } catch (error) {
      console.log("Offline detected. Enqueueing locally...", error);
    }

    if (!isEditMode) {
      await offlineQueue.enqueue(payload as any);
      Alert.alert(
        "Saved Locally",
        "Network unreachable. Asset stored in offline queue.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } else {
      Alert.alert(
        "Offline Error",
        "Updating existing assets requires an active network connection.",
      );
    }
  };

  // 5. CONDITIONAL RENDER STATES (AFTER ALL HOOKS & FUNCTIONS)
  if (isChecking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (loadingAsset) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ marginTop: 12, color: "#64748b" }}>
          Loading Asset Details...
        </Text>
      </View>
    );
  }

  const scopeBreadcrumb = [propertyName, buildingName, floorName, roomName]
    .filter(Boolean)
    .join(" › ");

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditMode ? "Edit Asset" : "New Asset Survey",
          headerBackTitle: "Back",
        }}
      />

      <ScrollView style={styles.container}>
        <Text style={styles.headerTitle}>
          {isEditMode ? "✏️ Edit Asset" : "➕ New Asset Survey"}
        </Text>

        {scopeBreadcrumb ? (
          <View style={styles.scopeBox}>
            <Text style={styles.scopeTitle}>Target Scope Context:</Text>
            <Text style={styles.subHeading}>🏢 {scopeBreadcrumb}</Text>
          </View>
        ) : null}

        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>
            Completion Score: {completionScore}%
          </Text>
        </View>

        {/* Asset Name */}
        <Text style={styles.label}>Asset Name *</Text>
        <TextInput
          style={styles.input}
          value={assetName}
          onChangeText={setAssetName}
          placeholder="e.g. Chiller Unit 1"
        />

        {/* Category Section */}
        <View style={styles.cardSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Category Classification</Text>
            <View style={styles.rowCenter}>
              <Text style={styles.toggleLabel}>Manual Add</Text>
              <Switch
                value={isManualCategory}
                onValueChange={setIsManualCategory}
                trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
              />
            </View>
          </View>

          {!isManualCategory ? (
            <>
              {loadingMetaData ? (
                <ActivityIndicator
                  size="small"
                  color="#0284c7"
                  style={{ marginVertical: 12 }}
                />
              ) : (
                <>
                  <Text style={styles.label}>Category *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                  >
                    {categories.map((cat) => {
                      const isCatSelected =
                        String(cat.id) === String(selectedCategoryId);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.chip,
                            isCatSelected && styles.chipActive,
                          ]}
                          onPress={() => setSelectedCategoryId(String(cat.id))}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isCatSelected && styles.chipTextActive,
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {selectedCategoryId ? (
                    <>
                      <Text style={styles.label}>Subcategory *</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipRow}
                      >
                        {filteredSubcategories.map((sub) => {
                          const isSubSelected =
                            String(sub.id) === String(selectedSubcategoryId);
                          return (
                            <TouchableOpacity
                              key={sub.id}
                              style={[
                                styles.chip,
                                isSubSelected && styles.chipActive,
                              ]}
                              onPress={() => handleSelectSubcategory(sub)}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSubSelected && styles.chipTextActive,
                                ]}
                              >
                                {sub.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </>
                  ) : (
                    <Text style={styles.helperText}>
                      Select a Category to view Subcategories.
                    </Text>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>Custom Category Name *</Text>
              <TextInput
                style={styles.input}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="e.g. Solar Equipment"
              />

              <Text style={styles.label}>Custom Subcategory Name *</Text>
              <TextInput
                style={styles.input}
                value={customSubcategory}
                onChangeText={setCustomSubcategory}
                placeholder="e.g. Inverter Units"
              />
            </>
          )}
        </View>

        {/* Asset Photos Section */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>📸 Asset Photos</Text>

          {photoUrls.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoContainer}
            >
              {photoUrls.map((url, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri: url }} style={styles.photoThumbnail} />
                  <TouchableOpacity
                    style={styles.deletePhotoBtn}
                    onPress={() =>
                      setPhotoUrls(photoUrls.filter((_, i) => i !== index))
                    }
                  >
                    <Text style={styles.deletePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.photoButton}
            onPress={handleTakePhoto}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.photoButtonText}>📷 Take Photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Dynamic Spec Fields */}
        {!isManualCategory && specSchema.length > 0 && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Asset Specifications</Text>
            {specSchema.map((field) => (
              <View key={field.key} style={{ marginTop: 8 }}>
                <Text style={styles.label}>
                  {field.label}{" "}
                  {field.required && (
                    <Text style={{ color: "#ef4444" }}>*</Text>
                  )}
                </Text>

                {(field.type === "text" || field.type === "number") && (
                  <TextInput
                    style={styles.input}
                    value={
                      specValues[field.key] !== undefined
                        ? String(specValues[field.key])
                        : ""
                    }
                    onChangeText={(val) =>
                      handleSpecFieldChange(
                        field.key,
                        field.type === "number"
                          ? val
                            ? Number(val)
                            : ""
                          : val,
                      )
                    }
                    keyboardType={
                      field.type === "number" ? "numeric" : "default"
                    }
                    placeholder={`Enter ${field.label}`}
                  />
                )}

                {field.type === "select" && field.options && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                  >
                    {field.options.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.chip,
                          specValues[field.key] === option && styles.chipActive,
                        ]}
                        onPress={() => handleSpecFieldChange(field.key, option)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            specValues[field.key] === option &&
                              styles.chipTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Equipment Specs */}
        <Text style={styles.label}>Make / Brand *</Text>
        {curatedMakes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {curatedMakes.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, make === m && styles.chipActive]}
                onPress={() => setMake(m)}
              >
                <Text
                  style={[styles.chipText, make === m && styles.chipTextActive]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <TextInput
          style={styles.input}
          value={make}
          onChangeText={setMake}
          placeholder="e.g. Daikin"
        />

        <Text style={styles.label}>Model Number</Text>
        <TextInput
          style={styles.input}
          value={modelNumber}
          onChangeText={setModelNumber}
          placeholder="e.g. EWAD-CZ"
        />

        <Text style={styles.label}>Serial Number</Text>
        <TextInput
          style={styles.input}
          value={serialNumber}
          onChangeText={setSerialNumber}
          placeholder="e.g. SN-882310"
        />

        <Text style={styles.label}>Grid Reference</Text>
        <TextInput
          style={styles.input}
          value={gridReference}
          onChangeText={setGridReference}
          placeholder="e.g. GRID-B3-04"
        />

        {/* Operational Status Selector */}
        <Text style={styles.label}>Operational Status</Text>
        <View style={styles.chipRow}>
          {["operative", "inoperative"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.chip,
                operationalStatus === status && styles.chipActive,
              ]}
              onPress={() => setOperationalStatus(status as any)}
            >
              <Text
                style={[
                  styles.chipText,
                  operationalStatus === status && styles.chipTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Criticality Selector */}
        <Text style={styles.label}>Criticality</Text>
        <View style={styles.chipRow}>
          {["low", "medium", "high"].map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.chip, criticality === level && styles.chipActive]}
              onPress={() => setCriticality(level as any)}
            >
              <Text
                style={[
                  styles.chipText,
                  criticality === level && styles.chipTextActive,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>GPS Coordinates</Text>
        <Text style={styles.gpsText}>
          {coords
            ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
            : "Acquiring GPS..."}
        </Text>

        <View style={{ marginTop: 24, marginBottom: 40 }}>
          <Button
            title={isEditMode ? "Update Asset" : "Save Asset Within Scope"}
            onPress={handleSubmit}
            color="#0284c7"
          />
        </View>
      </ScrollView>

      {/* Post-Creation Generated QR Code Modal */}
      <Modal visible={Boolean(createdAssetQr)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalSuccessBadge}>
              🎉 Asset Saved Successfully!
            </Text>
            <Text style={styles.modalTitle}>{createdAssetQr?.assetName}</Text>
            <Text style={styles.modalSubtitle}>
              Code: {createdAssetQr?.assetCode}
            </Text>

            <View style={styles.qrContainer}>
              {createdAssetQr?.qrCode && (
                <QRCode
                  value={createdAssetQr.qrCode}
                  size={190}
                  color="#0f172a"
                  backgroundColor="#ffffff"
                />
              )}
            </View>

            <Text style={styles.payloadText}>{createdAssetQr?.qrCode}</Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                setCreatedAssetQr(null);
                router.back();
              }}
            >
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
  },
  scopeBox: {
    padding: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  scopeTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  subHeading: { fontSize: 14, color: "#0f172a", fontWeight: "bold" },
  scoreBox: {
    padding: 12,
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
    marginBottom: 16,
  },
  scoreText: {
    color: "#0369a1",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  gpsText: { fontSize: 14, color: "#16a34a", fontWeight: "bold", marginTop: 4 },
  cardSection: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  toggleLabel: { fontSize: 12, color: "#64748b", marginRight: 6 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  chipRow: { flexDirection: "row", marginVertical: 6 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#0284c7" },
  chipText: { fontSize: 13, color: "#334155", textTransform: "capitalize" },
  chipTextActive: { color: "#ffffff", fontWeight: "bold" },
  helperText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: 6,
  },

  // Photo Section Styles
  photoContainer: { flexDirection: "row", marginVertical: 10 },
  photoWrapper: { marginRight: 10, position: "relative" },
  photoThumbnail: { width: 80, height: 80, borderRadius: 8 },
  deletePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  deletePhotoText: { color: "#ffffff", fontSize: 10, fontWeight: "bold" },
  photoButton: {
    backgroundColor: "#0284c7",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  photoButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },

  // Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    width: "82%",
  },
  modalSuccessBadge: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#16a34a",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
    marginTop: 2,
  },
  qrContainer: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  payloadText: { fontSize: 11, color: "#64748b", marginBottom: 16 },
  closeBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 6,
  },
  closeBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 14 },
});
