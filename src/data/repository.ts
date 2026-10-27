import AsyncStorage from '@react-native-async-storage/async-storage';
import {makeRepository} from './memory-repository';
import {photoStore} from './photo-store';
export const repository=makeRepository(AsyncStorage,photoStore);
