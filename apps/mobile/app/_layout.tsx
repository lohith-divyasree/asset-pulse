import { Stack } from "expo-router";
import { AxiosInterceptor } from "@/components/AxiosInterceptor";

export default function Layout() {
  return (
    <AxiosInterceptor>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0284c7" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "AssetPulse Mobile" }} />
        <Stack.Screen name="survey" options={{ title: "New Asset Survey" }} />
        <Stack.Screen name="scan" options={{ title: "Scan Asset QR Code" }} />
        <Stack.Screen name="audit" options={{ title: "Asset Inspection" }} />
      </Stack>
    </AxiosInterceptor>
  );
}
