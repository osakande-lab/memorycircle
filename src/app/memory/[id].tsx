import * as DocumentPicker from 'expo-document-picker';
import {repository} from '@/data/repository';
import {nextReelIndex} from '@/data/memory-repository';
import type {Memory,CollageLayout} from '@/data/memory-repository';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {BackgroundAudio} from '@/components/background-audio';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const LAYOUTS: { id: CollageLayout; label: string; description: string }[] = [
  { id: 'classic', label: 'Classic', description: 'One large photo and smaller photos' },
  { id: 'grid', label: 'Grid', description: 'Neat rows of photos' },
  { id: 'scrapbook', label: 'Scrapbook', description: 'Creative, tilted photo cards' },
];

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [collageLayout, setCollageLayout] =
    useState<CollageLayout>('classic');
  const [stopAudioSignal,setStopAudioSignal]=useState(0);
  const [isReelPlaying, setIsReelPlaying] = useState(false);
  const [reelPhotoIndex, setReelPhotoIndex] = useState(0);
  const [selectedMusic, setSelectedMusic] = useState<{
    name: string;
    uri: string;
} | null>(null);
const pickBackgroundMusic = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return;
    }

    const file = result.assets[0];

    setSelectedMusic({
      name: file.name,
      uri: file.uri,
    });

    Alert.alert(
      'Music selected',
      `${file.name} is ready to use as background music.`
    );
  } catch (error) {
    console.error('Error selecting music:', error);

    Alert.alert(
      'Music selection failed',
      'Could not select that audio file. Please try again.'
    );
  }
};
useEffect(() => {
  const photos = memory?.photos ?? [];

  if (!isReelPlaying || photos.length < 2) {
    return;
  }

  const timer = setInterval(() => {
    setReelPhotoIndex((currentIndex) =>
      nextReelIndex(currentIndex,photos.length)
    );
  }, 2500);

  return () => clearInterval(timer);
}, [isReelPlaying, memory?.photos]);


  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadMemory() {
        try {
          const found = await repository.find(id);


          if (active) {
            setMemory(found ?? null);
            setCollageLayout(found?.collageLayout ?? 'classic');
          }
        } catch (error) {
          console.error('Error loading memory:', error);
          if (active) {
            Alert.alert('Error', 'Could not load this memory.');
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      setLoading(true);
      loadMemory();

      return () => {
        active = false;
      };
    }, [id])
  );

  const changeCollageLayout = async (nextLayout: CollageLayout) => {
    if (!memory) return;

    const previousLayout = collageLayout;
    setCollageLayout(nextLayout);

    try {
      await repository.setLayout(memory.id,nextLayout);

      setMemory({ ...memory, collageLayout: nextLayout });
    } catch (error) {
      console.error('Error saving collage layout:', error);
      setCollageLayout(previousLayout);
      Alert.alert('Error', 'Could not save your collage layout.');
    }
  };

  useFocusEffect(useCallback(()=>()=>{setIsReelPlaying(false);setStopAudioSignal(s=>s+1);},[]));

  const getPhotoStyle = (index: number, total: number) => {
    if (collageLayout === 'scrapbook') {
      return [
        styles.photo,
        styles.scrapbookPhoto,
        index % 2 === 0 ? styles.scrapbookLeft : styles.scrapbookRight,
        index % 2 === 0 ? styles.rotateLeft : styles.rotateRight,
        { zIndex: total - index },
      ];
    }

    if (collageLayout === 'classic' && total >= 3) {
      return index === 0
        ? [styles.photo, styles.classicHero]
        : [styles.photo, styles.classicSmall];
    }

    return [styles.photo, styles.gridPhoto];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹  Back to memories</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#526B55" />
        ) : memory ? (
          <>
            <Text style={styles.eyebrow}>A MOMENT WORTH KEEPING</Text>

            <Text style={styles.title}>{memory.title}</Text>

            <Text style={styles.date}>
              {new Date(memory.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.story}>{memory.story}</Text>

            {!!memory.photos?.length && (
              <View style={styles.photoSection}>
                <Text style={styles.photoSectionTitle}>
                  Photos from this memory
                </Text>

                <Text style={styles.layoutHint}>
                  Choose how your memories look.
                </Text>

                <View style={styles.layoutSelector}>
                  {LAYOUTS.map((layout) => {
                    const selected = collageLayout === layout.id;

                    return (
                      <TouchableOpacity
                        key={layout.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[
                          styles.layoutOption,
                          selected && styles.layoutOptionSelected,
                        ]}
                        onPress={() => changeCollageLayout(layout.id)}
                      >
                        <Text
                          style={[
                            styles.layoutLabel,
                            selected && styles.layoutLabelSelected,
                          ]}
                        >
                          {layout.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.layoutDescription}>
                  {LAYOUTS.find((item) => item.id === collageLayout)?.description}
                </Text>

<View style={{gap:10,marginBottom:18}}>
  <TouchableOpacity accessibilityRole="button" style={styles.reelButton} onPress={()=>{setReelPhotoIndex(0);setIsReelPlaying(true);}}>
    <Text style={styles.reelButtonText}>Play Photo Reel</Text>
  </TouchableOpacity>
  <TouchableOpacity accessibilityRole="button" style={styles.reelButton} onPress={pickBackgroundMusic}>
    <Text style={styles.reelButtonText}>{selectedMusic?'Music: '+selectedMusic.name:'Choose Background Music'}</Text>
  </TouchableOpacity>
  <BackgroundAudio uri={selectedMusic?.uri??null} stopSignal={stopAudioSignal} />
  <Text style={styles.layoutHint}>This is an in-app photo slideshow. MP4 generation and downloads are planned.</Text>
</View>
{isReelPlaying && (
  <View style={{ marginBottom: 24 }}>
    <Image
      source={{ uri: memory.photos![reelPhotoIndex] }}
      style={{
        width: '100%',
        height: 300,
        borderRadius: 16,
        backgroundColor: '#E7E2D8',
      }}
      resizeMode="cover"
    />

    <Text
      style={{
        textAlign: 'center',
        color: '#526B55',
        marginTop: 10,
      }}
    >
      Photo {reelPhotoIndex + 1} of {memory.photos!.length}
    </Text>

    <TouchableOpacity
      style={{
        padding: 12,
        alignItems: 'center',
      }}
      onPress={() => {setIsReelPlaying(false);setStopAudioSignal(s=>s+1);}}
    >
      <Text style={{ color: '#526B55', fontWeight: '700' }}>
        ■ Stop Reel
      </Text>
    </TouchableOpacity>
  </View>
)}

                <View
                  style={[
                    styles.photoGrid,
                    collageLayout === 'scrapbook' &&
                      styles.scrapbookContainer,
                  ]}
                >
                  {memory.photos.map((uri, index) => (
                    <Image
                      key={`${uri}-${index}`}
                      source={{ uri }}
                      style={getPhotoStyle(index, memory.photos!.length)}
                      resizeMode="cover"
                      onError={() =>
                        console.log('Photo failed to load:', index)
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.footerCard}>
              <Text style={styles.heart}>♡</Text>
              <Text style={styles.footerText}>
                Some moments deserve to stay with us forever.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Memory not found</Text>
            <Text style={styles.emptyText}>
              This memory may have been removed.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reelButton:{backgroundColor:'#526B55',padding:15,borderRadius:12,alignItems:'center'},
  reelButtonText:{color:'#fff',fontWeight:'700'},
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  container: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 34,
  },
  backText: {
    color: '#526B55',
    fontSize: 15,
    fontWeight: '700',
  },
  eyebrow: {
    color: '#71816A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  title: {
    color: '#28392D',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
  },
  date: {
    color: '#99998F',
    fontSize: 13,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E7E2D8',
    marginVertical: 26,
  },
  story: {
    color: '#41483F',
    fontSize: 16,
    lineHeight: 28,
  },
  photoSection: {
    marginTop: 28,
  },
  photoSectionTitle: {
    color: '#28392D',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  layoutHint: {
    color: '#77796F',
    fontSize: 13,
    marginBottom: 14,
  },
  layoutSelector: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 10,
  },
  layoutOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9DFD2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  layoutOptionSelected: {
    backgroundColor: '#526B55',
    borderColor: '#526B55',
  },
  layoutLabel: {
    color: '#526B55',
    fontSize: 12,
    fontWeight: '700',
  },
  layoutLabelSelected: {
    color: '#FFFFFF',
  },
  layoutDescription: {
    color: '#77796F',
    fontSize: 12,
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  photo: {
    backgroundColor: '#E7E2D8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9DFD2',
  },
  classicHero: {
    width: '100%',
    height: 240,
  },
  classicSmall: {
    width: '48%',
    height: 150,
  },
  gridPhoto: {
    width: '48%',
    height: 170,
  },
  scrapbookContainer: {
    gap: 0,
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  scrapbookPhoto: {
    width: '78%',
    height: 205,
    borderRadius: 4,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    marginBottom: -18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 4,
  },
  scrapbookLeft: {
    alignSelf: 'flex-start',
  },
  scrapbookRight: {
    alignSelf: 'flex-end',
  },
  rotateLeft: {
    transform: [{ rotate: '-3deg' }],
  },
  rotateRight: {
    transform: [{ rotate: '3deg' }],
  },
  footerCard: {
    backgroundColor: '#F0F2E9',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginTop: 36,
  },
  heart: {
    color: '#526B55',
    fontSize: 32,
    marginBottom: 8,
  },
  footerText: {
    color: '#526B55',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
  },
  emptyTitle: {
    color: '#28392D',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyText: {
    color: '#77796F',
    fontSize: 14,
    marginTop: 10,
  },
});
