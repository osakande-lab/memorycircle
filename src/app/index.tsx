import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  
  const [memories, setMemories] = useState<
    { id: string; title: string; story: string; createdAt: string }[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadMemories() {
        try {
          const saved = await AsyncStorage.getItem('memorycircle_memories');
          const parsed = saved ? JSON.parse(saved) : [];

          if (active) {
            setMemories(parsed);
          }
        } catch (error) {
          console.error('Error loading memories:', error);
        }
      }

      loadMemories();

      return () => {
        active = false;
      };
    }, [])
  );
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.brand}>MemoryCircle</Text>
            <Text style={styles.tagline}>Your moments, together.</Text>
          </View>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>D</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>YOUR LITTLE CORNER OF THE WORLD</Text>
          <Text style={styles.title}>Every memory{'\n'}has a story.</Text>
          <Text style={styles.subtitle}>
            Keep the people, moments, and stories you love close.
          </Text>
        </View>

        <TouchableOpacity
  style={styles.createButton}
  onPress={() => {
    console.log('CREATE MEMORY BUTTON PRESSED');
    router.push('/create-memory');
  }}
>
  <Text style={styles.createButtonText}>
    ＋  Create a memory
  </Text>
</TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your circle</Text>
          <Text style={styles.sectionLink}>See all</Text>
        </View>

        <View style={styles.circleCard}>
          <View style={styles.circleIcon}>
            <Text style={styles.circleEmoji}>♡</Text>
          </View>
          <View style={styles.circleContent}>
            <Text style={styles.cardTitle}>Your story starts here</Text>
            <Text style={styles.cardDescription}>
              Create a circle and invite your favourite people to share
              memories together.
            </Text>
          </View>
        </View>

        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent memories</Text>
          {memories.length > 0 && (
            <Text style={styles.sectionLink}>
              {memories.length} saved
            </Text>
          )}
        </View>

        {memories.length === 0 ? (
          <View style={styles.emptyCard}>
  <Text style={styles.emptyEmoji}>♡</Text>
  <Text style={styles.emptyTitle}>
    Your memories will live here
  </Text>
  <Text style={styles.emptyDescription}>
    Save your first memory and it will appear here.
  </Text>
</View>
) : (
  memories.map((memory) => (
    <TouchableOpacity
      key={memory.id}
      style={styles.memoryCard}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: '/memory/[id]',
          params: { id: memory.id },
        })
      }
    >
            <Text style={styles.memoryCardTitle}>{memory.title}</Text>
      <Text style={styles.memoryStory}>{memory.story}</Text>
      <Text style={styles.memoryDate}>
        {new Date(memory.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  ))
)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  container: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 42,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#526B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  brand: {
    color: '#28392D',
    fontSize: 18,
    fontWeight: '800',
  },
  tagline: {
    color: '#85877D',
    fontSize: 12,
    marginTop: 3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7DED0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#526B55',
    fontSize: 16,
    fontWeight: '700',
  },
  welcome: {
    marginBottom: 24,
  },
  eyebrow: {
    color: '#71816A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  title: {
    color: '#28392D',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  subtitle: {
    color: '#77796F',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 300,
  },
  createButton: {
    backgroundColor: '#526B55',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 36,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#28392D',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionLink: {
    color: '#71816A',
    fontSize: 13,
    fontWeight: '700',
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEAE2',
    padding: 17,
    marginBottom: 32,
  },
  circleIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#F0F2E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmoji: {
    fontSize: 27,
    color: '#526B55',
  },
  circleContent: {
    flex: 1,
    marginLeft: 13,
  },
  cardTitle: {
    color: '#303B30',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
  },
  cardDescription: {
    color: '#85877D',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#F0EEE6',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyEmoji: {
    color: '#71816A',
    fontSize: 35,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#303B30',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#85877D',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 9,
  },
  footer: {
    color: '#A2A094',
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 32,
  },
  memoryDate: {
  color: '#A2A094',
  fontSize: 11,
  marginTop: 8,
},

  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEAE2',
    padding: 18,
    marginBottom: 14,
  },
  memoryCardTitle: {
    color: '#28392D',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  memoryStory: {
    color: '#77796F',
    fontSize: 14,
    lineHeight: 22,
  },
});