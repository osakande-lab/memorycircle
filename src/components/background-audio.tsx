import {useCallback,useEffect,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {setAudioModeAsync,useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {Text,TouchableOpacity,View} from 'react-native';
export function BackgroundAudio({uri,stopSignal}:{uri:string|null;stopSignal:number}){
 const player=useAudioPlayer(uri);const status=useAudioPlayerStatus(player);const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>()=>{player.pause();},[player]));
 useEffect(()=>{player.pause();},[player,stopSignal]);
 const style={backgroundColor:'#526B55',padding:15,borderRadius:12,alignItems:'center' as const};
 return <View style={{gap:10}}>
  <TouchableOpacity accessibilityRole="button" disabled={!uri} style={style} onPress={async()=>{try{setError('');await setAudioModeAsync({playsInSilentMode:true});player.play();}catch{setError('Could not play this audio file.');}}}><Text style={{color:'#fff',fontWeight:'700'}}>Play Music</Text></TouchableOpacity>
  <TouchableOpacity accessibilityRole="button" disabled={!uri} style={style} onPress={()=>{player.pause();void player.seekTo(0);}}><Text style={{color:'#fff',fontWeight:'700'}}>Stop Music</Text></TouchableOpacity>
  <Text accessibilityLiveRegion="polite" style={{color:'#526B55'}}>{status.playing?'Music playing':uri?'Music stopped':'No audio selected'}</Text>
  {!!(error||status.error)&&<Text accessibilityRole="alert" style={{color:'#a02f24'}}>{error||status.error}</Text>}
 </View>;
}
