import {useCallback,useEffect,useRef,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {Text,TouchableOpacity,View} from 'react-native';
export function BackgroundAudio({uri,stopSignal}:{uri:string|null;stopSignal:number}){
 const audio=useRef<HTMLAudioElement>(null);const [playing,setPlaying]=useState(false);const [error,setError]=useState('');
 useFocusEffect(useCallback(()=>()=>{audio.current?.pause();},[]));
 useEffect(()=>{audio.current?.pause();},[stopSignal]);
 const style={backgroundColor:'#526B55',padding:15,borderRadius:12,alignItems:'center' as const};
 return <View style={{gap:10}}>
  <audio ref={audio} src={uri??undefined} preload="metadata" onLoadStart={()=>{setError('');setPlaying(false);}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setError('Could not play this audio file. Choose a supported file.')}/>
  <TouchableOpacity accessibilityRole="button" disabled={!uri} style={style} onPress={()=>{setError('');audio.current?.play().catch(()=>setError('Playback was blocked. Try Play Music again or choose another audio file.'));}}><Text style={{color:'#fff',fontWeight:'700'}}>Play Music</Text></TouchableOpacity>
  <TouchableOpacity accessibilityRole="button" disabled={!uri} style={style} onPress={()=>{if(audio.current){audio.current.pause();audio.current.currentTime=0;}}}><Text style={{color:'#fff',fontWeight:'700'}}>Stop Music</Text></TouchableOpacity>
  <Text accessibilityLiveRegion="polite" style={{color:'#526B55'}}>{playing?'Music playing':uri?'Music stopped':'No audio selected'}</Text>
  {!!error&&<Text accessibilityRole="alert" style={{color:'#a02f24'}}>{error}</Text>}
 </View>;
}
