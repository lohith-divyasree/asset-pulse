// apps/mobile/app/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveUserSession, AuthUser } from '../lib/authStore';
import { ForcePasswordModal } from '@/components/ForcePasswordModal';
import { API_BASE_URL } from '../lib/constants'; // Standardize using your api config

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [codeOrPassword, setCodeOrPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = codeOrPassword.trim();

    if (!cleanEmail || !cleanCode) {
      Alert.alert('Missing Fields', 'Please enter your email and pass code or password.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, codeOrPassword: cleanCode }),
      });

      // Safely parse JSON response regardless of HTTP status code
      let json;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      // Handle 401 Unauthorized or other HTTP errors
      if (!res.ok || !json?.success) {
        const errorMsg = json?.error || `Authentication failed (${res.status})`;
        Alert.alert('Login Failed', errorMsg);
        return;
      }

      // Successful Auth
      setPendingUser(json.user);

      if (json.mustChangePassword) {
        setShowPasswordModal(true);
      } else {
        await completeLogin(json.user);
      }
    } catch (err: any) {
      // Handles actual network drops (e.g. server offline, invalid IP)
      Alert.alert(
        'Connection Error',
        `Unable to reach backend at ${API_BASE_URL}.\n\nPlease ensure your Next.js server is running.`
      );
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = async (user: AuthUser) => {
    await saveUserSession(user);
    setShowPasswordModal(false);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AssetPulse</Text>
      <Text style={styles.subtitle}>Survey Engineer Portal</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. surveyor@assetpulse.com"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>One-Time Code / Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 6-char code or password"
          placeholderTextColor="#64748b"
          value={codeOrPassword}
          onChangeText={setCodeOrPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>
      </View>

      {pendingUser && (
        <ForcePasswordModal
          visible={showPasswordModal}
          userId={pendingUser.id}
          apiBaseUrl={API_BASE_URL}
          onSuccess={() => completeLogin(pendingUser)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38bdf8',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#0284c7',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});