import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function CreateMemoryScreen() {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  
const copyPhotoToPermanentStorage = async (
  uri: string,
  index: number
): Promise<string> => {
  const photoDirectory = new Directory(
    Paths.document,
    'memorycircle-photos'
  );

  photoDirectory.create({
    idempotent: true,
    intermediates: true,
  });

  const source = new File(uri);

  if (!source.exists) {
    throw new Error('The selected photo could not be found.');
  }

  const extension = source.extension || '.jpg';

  const destination = new File(
    photoDirectory,
    `photo-${Date.now()}-${index}${extension}`
  );

  await source.copy(destination);

  if (!destination.exists) {
    throw new Error('The photo could not be saved permanently.');
  }

  return destination.uri;
};


  
const pickPhotos = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });

    if (result.canceled) {
      console.log('Photo selection cancelled');
      return;
    }

    const photos = result.assets.map((asset) => asset.uri);

    console.log('Selected photo URIs:', photos);
    console.log('Number selected:', photos.length);

    setSelectedPhotos(photos);
  } catch (error) {
    console.error('Photo picker error:', error);
    Alert.alert('Photo error', 'Could not select photos. Please try again.');
  }
};

  
  async function handleSave() {
    if (!title.trim() || !story.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter a title and your memory.'
      );
      return;
    }

    try {
      const existingData = await AsyncStorage.getItem('memorycircle_memories');
      const memories = existingData ? JSON.parse(existingData) : [];
      
      const permanentPhotos: string[] = [];

      for (const [index, uri] of selectedPhotos.entries()) {
        const permanentUri = await copyPhotoToPermanentStorage(
          uri,
          index
        );

        permanentPhotos.push(permanentUri);
      }


      const newMemory = {
        id: Date.now().toString(),
        title: title.trim(),
        story: story.trim(),
        photos: permanentPhotos,
        createdAt: new Date().toISOString(),
      };

      memories.unshift(newMemory);

      await AsyncStorage.setItem(
        'memorycircle_memories',
        JSON.stringify(memories)
      );

      Alert.alert('Memory saved!', 'Your memory has been saved on this device.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Could not save', 'Please try again.');
      console.error('Error saving memory:', error);
    }
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹  Back</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>A MOMENT WORTH KEEPING</Text>
          <Text style={styles.heading}>Create a memory.</Text>
          <Text style={styles.subtitle}>
            The little moments often become the biggest memories.
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>MEMORY TITLE</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Give your memory a name..."
              placeholderTextColor="#99998F"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <View style={styles.separator} />

            <Text style={styles.label}>YOUR STORY</Text>
            <TextInput
              style={styles.storyInput}
              placeholder="What happened? Who was there? Why is it special?"
              placeholderTextColor="#99998F"
              value={story}
              onChangeText={setStory}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={styles.characterCount}>
              {story.length}/2000 characters
            </Text>
          </View>

          {/* Photo selection section */}
      <View style={styles.photoSection}>
        <Text style={styles.photoSectionTitle}>Photos</Text>

        <TouchableOpacity
          style={styles.photoButton}
          onPress={pickPhotos}
          activeOpacity={0.8}
        >
          <Text style={styles.photoButtonText}>
            + Choose Photos
          </Text>
                  <Text style={styles.photoHint}>
          {selectedPhotos.length} photo(s) selected
        </Text>
        </TouchableOpacity>

        {selectedPhotos.length > 0 && (
          <View style={styles.photoGrid}>
            {selectedPhotos.map((uri, index) => ( 
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              style={styles.photoPreview}
              resizeMode="cover"
              onLoad={() => console.log('Preview loaded:', index)}
              onError={(error) =>
                console.log(
                  'Preview failed:',
                  index,
                  uri,
                  error.nativeEvent.error
                )
              }
            />
            ))}
          </View>
        )}

        <Text style={styles.photoHint}>
          Choose up to 10 photos for this memory.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save memory  →</Text>
      </TouchableOpacity>


          <Text style={styles.note}>
            Your story deserves to be remembered.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  keyboardView: {
    flex: 1,
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
    paddingRight: 16,
    marginBottom: 30,
  },
  backText: {
    fontSize: 15,
    color: '#526B55',
    fontWeight: '700',
  },
  eyebrow: {
    color: '#71816A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heading: {
    color: '#28392D',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: '#77796F',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 28,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEEAE2',
    padding: 20,
  },
  label: {
    color: '#71816A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  titleInput: {
    color: '#28392D',
    fontSize: 16,
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#EEEAE2',
    marginVertical: 22,
  },
  storyInput: {
    minHeight: 180,
    color: '#28392D',
    fontSize: 15,
    lineHeight: 23,
    paddingTop: 8,
  },
  characterCount: {
    textAlign: 'right',
    color: '#99998F',
    fontSize: 11,
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#526B55',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  note: {
    color: '#99998F',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
    photoSection: {
    marginTop: 24,
  },
  photoSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28392D',
    marginBottom: 12,
  },
  photoButton: {
    backgroundColor: '#F0F2E9',
    borderWidth: 1,
    borderColor: '#D9DFD2',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#526B55',
    fontSize: 15,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  photoPreview: {
    width: '30%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E7E2D8',
    borderWidth: 1,
    borderColor: '#D9DFD2',
  },
  photoHint: {
    fontSize: 12,
    color: '#77796F',
    marginTop: 10,
  },
});