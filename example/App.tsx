import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  TrimError,
  isAvailable,
  trimAsync,
} from 'react-native-lossless-trim';

export default function App() {
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [startMs, setStartMs] = useState('0');
  const [endMs, setEndMs] = useState('3000');
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourcePlayer = useVideoPlayer(sourceUri, (p) => {
    p.loop = true;
  });
  const resultPlayer = useVideoPlayer(resultUri, (p) => {
    p.loop = true;
    p.play();
  });

  const pickVideo = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setSourceUri(result.assets[0].uri);
      setResultUri(null);
      setElapsedMs(null);
    }
  };

  const runTrim = async () => {
    if (!sourceUri) return;
    setBusy(true);
    setError(null);
    setResultUri(null);
    setElapsedMs(null);
    const startedAt = Date.now();
    try {
      const { uri } = await trimAsync(sourceUri, {
        startMs: Number(startMs),
        endMs: Number(endMs),
      });
      setElapsedMs(Date.now() - startedAt);
      setResultUri(uri);
    } catch (e) {
      const code = e instanceof TrimError ? e.code : 'ERR_UNKNOWN';
      const message = e instanceof Error ? e.message : String(e);
      setError(`${code}: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>react-native-lossless-trim</Text>
        <Text style={styles.subtitle}>
          ffmpeg-free passthrough trim {'·'} native APIs only
        </Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, isAvailable() ? styles.badgeOk : styles.badgeBad]}>
            <Text style={styles.badgeText}>
              native module: {isAvailable() ? 'available' : 'unavailable'}
            </Text>
          </View>
        </View>

        <Pressable style={styles.button} onPress={pickVideo}>
          <Text style={styles.buttonText}>{sourceUri ? 'Pick another video' : 'Pick a video'}</Text>
        </Pressable>

        {sourceUri ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SOURCE</Text>
            <VideoView player={sourcePlayer} style={styles.video} contentFit="contain" />
            <View style={styles.rangeRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>start (ms)</Text>
                <TextInput
                  style={styles.input}
                  value={startMs}
                  onChangeText={setStartMs}
                  keyboardType="number-pad"
                  placeholderTextColor="#64748b"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>end (ms)</Text>
                <TextInput
                  style={styles.input}
                  value={endMs}
                  onChangeText={setEndMs}
                  keyboardType="number-pad"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>
            <Pressable
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={runTrim}
              disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#0b1120" />
              ) : (
                <Text style={styles.buttonText}>Trim (lossless)</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {resultUri ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TRIMMED</Text>
            {elapsedMs != null ? (
              <Text style={styles.timing}>done in {elapsedMs} ms (no re-encode)</Text>
            ) : null}
            <VideoView player={resultPlayer} style={styles.video} contentFit="contain" />
            <Text style={styles.mono}>{resultUri}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0b1120' },
  content: { padding: 20, paddingTop: 64, gap: 14 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: -6 },
  badgeRow: { flexDirection: 'row' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeOk: { backgroundColor: '#064e3b' },
  badgeBad: { backgroundColor: '#7f1d1d' },
  badgeText: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },
  button: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0b1120', fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#111c33',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardLabel: { color: '#7dd3fc', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 10 },
  rangeRow: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, gap: 6 },
  fieldLabel: { color: '#94a3b8', fontSize: 12 },
  input: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  timing: { color: '#4ade80', fontSize: 13, fontWeight: '600' },
  mono: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  error: { color: '#fca5a5', fontSize: 13 },
});
