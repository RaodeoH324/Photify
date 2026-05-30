import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { AuthContext } from './AuthContext';


export const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlistQueue, setPlaylistQueue] = useState([]); // The playlist/album tracks
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [userQueue, setUserQueue] = useState([]); // Manually queued songs (swipe/add to queue)
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [likedSongs, setLikedSongs] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState([]);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: repeat one (play once more), 2: infinite loop
  const [isShuffle, setIsShuffle] = useState(false);

  // Refs to avoid stale closures in onPlaybackStatusUpdate / handleTrackEnd
  const userQueueRef = useRef([]);
  const playlistQueueRef = useRef([]);
  const playlistIndexRef = useRef(-1);
  const repeatModeRef = useRef(0);
  const soundRef = useRef(null);

  useEffect(() => { userQueueRef.current = userQueue; }, [userQueue]);
  useEffect(() => { playlistQueueRef.current = playlistQueue; }, [playlistQueue]);
  useEffect(() => { playlistIndexRef.current = playlistIndex; }, [playlistIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [isFullPlayerVisible, setIsFullPlayerVisible] = useState(false);
  const [playCounts, setPlayCounts] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [sleepTimerId, setSleepTimerId] = useState(null);
  const [sleepTimerEnd, setSleepTimerEnd] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Configure notifications
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  useEffect(() => {
    loadData();
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('music-control', {
        name: 'Music Control',
        importance: Notifications.AndroidImportance.MAX,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: null,
        vibrationPattern: [0],
        enableVibration: false,
      });
    }
  }, [user]);

  const getStorageKey = (key) => {
    if (!user || !user.email) return key;
    return `${key}_${user.email}`;
  };

  const loadData = async () => {
    try {
      const likedKey = getStorageKey('likedSongs');
      const playlistKey = getStorageKey('userPlaylists');
      const pinnedKey = getStorageKey('pinnedPlaylists');
      const playCountKey = getStorageKey('playCounts');
      const notifKey = getStorageKey('notifications');

      const savedLiked = await AsyncStorage.getItem(likedKey);
      setLikedSongs(savedLiked ? JSON.parse(savedLiked) : []);
      
      const savedPlaylists = await AsyncStorage.getItem(playlistKey);
      let playlists = savedPlaylists ? JSON.parse(savedPlaylists) : [];
      
      // Ensure system playlists exist if they are intended to be editable
      const systemIds = [1, 2, 3, 4];
      const systemNames = ['All Music', 'Recent Hits', 'Party Mix', 'Workout'];
      
      let changed = false;
      systemIds.forEach((id, idx) => {
        if (!playlists.find(p => p.id === id)) {
          playlists.push({ id, name: systemNames[idx], tracks: [], track_count: 0, isSystem: true });
          changed = true;
        }
      });

      if (changed) {
        await AsyncStorage.setItem(playlistKey, JSON.stringify(playlists));
      }
      setUserPlaylists(playlists);

      const savedPinned = await AsyncStorage.getItem(pinnedKey);
      setPinnedPlaylistIds(savedPinned ? JSON.parse(savedPinned) : []);

      const savedPlayCounts = await AsyncStorage.getItem(playCountKey);
      setPlayCounts(savedPlayCounts ? JSON.parse(savedPlayCounts) : {});

      const savedNotifs = await AsyncStorage.getItem(notifKey);
      setNotifications(savedNotifs ? JSON.parse(savedNotifs) : []);
    } catch (e) {
      console.log('Error loading context data', e);
    }
  };

  const addNotification = async (message, type = 'info') => {
    const notif = {
      id: Date.now(),
      message,
      type,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
    };
    const updated = [notif, ...notifications].slice(0, 50);
    setNotifications(updated);
    try {
      await AsyncStorage.setItem(getStorageKey('notifications'), JSON.stringify(updated));
    } catch (e) {}
  };

  const clearNotifications = async () => {
    setNotifications([]);
    try {
      await AsyncStorage.setItem(getStorageKey('notifications'), JSON.stringify([]));
    } catch (e) {}
  };

  const getTrackColor = (track) => {
    const title = track.title || 'Untitled';
    const darkPalette = [
      '#3D2B1F', '#1a1a4d', '#8B0000', '#496869',
      '#2E0854', '#2F4F4F', '#4B0082', '#5D4037',
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return darkPalette[Math.abs(hash) % darkPalette.length];
  };

  const toggleLike = async (track) => {
    let newLiked;
    if (likedSongs.find(s => s.id === track.id)) {
      newLiked = likedSongs.filter(s => s.id !== track.id);
      addNotification(`Removed "${track.title}" from Liked Songs`, 'unlike');
    } else {
      newLiked = [...likedSongs, track];
      addNotification(`Added "${track.title}" to Liked Songs`, 'like');
    }
    setLikedSongs(newLiked);
    await AsyncStorage.setItem(getStorageKey('likedSongs'), JSON.stringify(newLiked));
  };

  const getArtist = (track) => {
    if (!track) return '';
    return track.artist;
  };

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const hideToast = () => {
    setToastVisible(false);
    setToastMessage(null);
  };

  // Add to user queue (separate from playlist queue)
  const addToQueue = (track) => {
    setUserQueue(prev => [...prev, track]);
    showToast(`"${track.title}" added to queue`);
    addNotification(`Added "${track.title}" to queue`, 'queue');
  };

  // Remove a track from user queue by index
  const removeFromUserQueue = (index) => {
    setUserQueue(prev => prev.filter((_, i) => i !== index));
  };

  // Clear the entire user queue
  const clearUserQueue = () => {
    setUserQueue([]);
  };

  const addToPlaylist = async (playlistId, track) => {
    const updatedPlaylists = userPlaylists.map(p => {
      if (p.id === playlistId) {
        if (!p.tracks.find(t => t.id === track.id)) {
          return { ...p, tracks: [...p.tracks, track], track_count: p.tracks.length + 1 };
        }
      }
      return p;
    });
    setUserPlaylists(updatedPlaylists);
    await AsyncStorage.setItem(getStorageKey('userPlaylists'), JSON.stringify(updatedPlaylists));
    const playlist = updatedPlaylists.find(p => p.id === playlistId);
    if (playlist) {
      addNotification(`Added "${track.title}" to ${playlist.name}`, 'playlist');
    }
  };

  const removeFromPlaylist = async (playlistId, trackId) => {
    const updatedPlaylists = userPlaylists.map(p => {
      if (p.id === playlistId) {
        const filtered = p.tracks.filter(t => t.id !== trackId);
        return { ...p, tracks: filtered, track_count: filtered.length };
      }
      return p;
    });
    setUserPlaylists(updatedPlaylists);
    await AsyncStorage.setItem(getStorageKey('userPlaylists'), JSON.stringify(updatedPlaylists));
  };

  const deletePlaylist = async (playlistId) => {
    const updated = userPlaylists.filter(p => p.id !== playlistId);
    setUserPlaylists(updated);
    await AsyncStorage.setItem(getStorageKey('userPlaylists'), JSON.stringify(updated));
    
    // Also remove from pinned if deleted
    if (pinnedPlaylistIds.includes(playlistId)) {
      const updatedPinned = pinnedPlaylistIds.filter(id => id !== playlistId);
      setPinnedPlaylistIds(updatedPinned);
      await AsyncStorage.setItem(getStorageKey('pinnedPlaylists'), JSON.stringify(updatedPinned));
    }
  };

  const createPlaylist = async (name) => {
    const newP = { id: Date.now(), name, tracks: [], track_count: 0 };
    const updated = [...userPlaylists, newP];
    setUserPlaylists(updated);
    await AsyncStorage.setItem(getStorageKey('userPlaylists'), JSON.stringify(updated));
    addNotification(`Created playlist "${name}"`, 'playlist');
    return newP;
  };

  const renamePlaylist = async (playlistId, newName) => {
    const updatedPlaylists = userPlaylists.map(p => {
      if (p.id === playlistId) {
        return { ...p, name: newName };
      }
      return p;
    });
    setUserPlaylists(updatedPlaylists);
    await AsyncStorage.setItem(getStorageKey('userPlaylists'), JSON.stringify(updatedPlaylists));
    addNotification(`Renamed playlist to "${newName}"`, 'playlist');
  };

  const togglePinPlaylist = async (playlistId) => {
    let newPinned;
    if (pinnedPlaylistIds.includes(playlistId)) {
      newPinned = pinnedPlaylistIds.filter(id => id !== playlistId);
    } else {
      newPinned = [playlistId, ...pinnedPlaylistIds];
    }
    setPinnedPlaylistIds(newPinned);
    await AsyncStorage.setItem(getStorageKey('pinnedPlaylists'), JSON.stringify(newPinned));
  };

  // Play count tracking
  const incrementPlayCount = async (track) => {
    if (!track) return;
    const updated = { ...playCounts };
    if (updated[track.id]) {
      updated[track.id] = {
        ...updated[track.id],
        count: updated[track.id].count + 1,
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverUrl,
      };
    } else {
      updated[track.id] = {
        count: 1,
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverUrl,
      };
    }
    setPlayCounts(updated);
    try {
      await AsyncStorage.setItem(getStorageKey('playCounts'), JSON.stringify(updated));
    } catch (e) {
      console.log('Error saving play counts', e);
    }
  };

  const resetPlayCounts = async () => {
    setPlayCounts({});
    try {
      await AsyncStorage.setItem(getStorageKey('playCounts'), JSON.stringify({}));
    } catch (e) {}
  };

  const clearCache = () => {
    global.__photifyClearCache = true;
  };

  // Sleep timer
  const setSleepTimer = (minutes) => {
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      setSleepTimerId(null);
      setSleepTimerEnd(null);
    }
    if (minutes === 0) return;

    const endTime = Date.now() + minutes * 60 * 1000;
    setSleepTimerEnd(endTime);
    
    const timerId = setTimeout(async () => {
      if (sound) {
        await sound.pauseAsync();
      }
      setSleepTimerId(null);
      setSleepTimerEnd(null);
      addNotification('Sleep timer ended - playback paused', 'timer');
    }, minutes * 60 * 1000);

    setSleepTimerId(timerId);
    addNotification(`Sleep timer set for ${minutes} minutes`, 'timer');
  };

  const cancelSleepTimer = () => {
    if (sleepTimerId) {
      clearTimeout(sleepTimerId);
      setSleepTimerId(null);
      setSleepTimerEnd(null);
      addNotification('Sleep timer cancelled', 'timer');
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        handleTrackEnd();
      }
    }
  };

  const handleTrackEnd = async () => {
    const mode = repeatModeRef.current;
    const snd = soundRef.current;
    if (mode === 1) {
      // Repeat once: play the song one more time, then move to next
      setRepeatMode(0);
      repeatModeRef.current = 0;
      if (snd) {
        await snd.setPositionAsync(0);
        await snd.playAsync();
      }
    } else if (mode === 2) {
      // Infinite loop: keep replaying forever
      if (snd) {
        await snd.setPositionAsync(0);
        await snd.playAsync();
      }
    } else {
      nextTrack();
    }
  };

  const playTrack = async (track, trackQueue = null, index = 0, playlistId = null) => {
    if (trackQueue) {
      setPlaylistQueue(trackQueue);
      setPlaylistIndex(index);
    }
    
    if (playlistId !== null) {
      setActivePlaylistId(playlistId);
    }
    
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.streamUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setCurrentTrack(track);
      setIsPlaying(true);
      incrementPlayCount(track);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      });

      updateNotification(track, true);
      
    } catch (e) {
      console.log('Playback error:', e);
    }
  };

  useEffect(() => {
    if (sound) {
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    }
  }, [sound, repeatMode, playlistQueue, playlistIndex, userQueue, isPlaying]);

  const togglePlay = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
      updateNotification(currentTrack, false);
    } else {
      await sound.playAsync();
      updateNotification(currentTrack, true);
    }
  };

  const updateNotification = async (track, playing) => {
    if (!track) return;
    
    try {
      await Notifications.dismissAllNotificationsAsync();
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: track.title,
          body: `${track.artist} • ${playing ? 'Playing' : 'Paused'}`,
          data: { trackId: track.id },
          sticky: true,
          color: '#8A2BE2',
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
          android: {
            channelId: 'music-control',
            sticky: true,
            onPress: 'photify://player',
            color: '#8A2BE2',
            icon: './assets/logo.png', // Fallback to app icon
          },
        },
        trigger: null,
      });
    } catch (e) {
      console.log('Error updating notification', e);
    }
  };

  const toggleRepeat = (mode = null) => {
    if (mode !== null) {
      setRepeatMode(mode);
    } else {
      setRepeatMode(prev => (prev + 1) % 3);
    }
  };

  const toggleShuffle = () => {
    if (!isShuffle) {
      const shuffled = [...playlistQueue].sort(() => Math.random() - 0.5);
      const newIdx = currentTrack ? shuffled.findIndex(t => t.id === currentTrack.id) : -1;
      setPlaylistQueue(shuffled);
      setPlaylistIndex(newIdx);
      setIsShuffle(true);
    } else {
      const sorted = [...playlistQueue].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      const newIdx = currentTrack ? sorted.findIndex(t => t.id === currentTrack.id) : -1;
      setPlaylistQueue(sorted);
      setPlaylistIndex(newIdx);
      setIsShuffle(false);
    }
  };

  // NEXT TRACK: User queue takes priority over playlist queue
  const nextTrack = async () => {
    // Use refs to read fresh state (avoids stale closure from onPlaybackStatusUpdate)
    const currentUserQueue = userQueueRef.current;
    const currentPlaylistQueue = playlistQueueRef.current;
    const currentPlaylistIndex = playlistIndexRef.current;
    
    // Check user queue first — it has priority
    if (currentUserQueue.length > 0) {
      const nextFromQueue = currentUserQueue[0];
      // Remove the first item from user queue
      setUserQueue(prev => prev.slice(1));
      // Play it without changing playlist position (so we can resume playlist after queue empties)
      await playTrackFromQueue(nextFromQueue);
      return;
    }
    
    // No user queue — continue with playlist
    if (currentPlaylistQueue.length === 0) return;
    
    let nextIdx = currentPlaylistIndex + 1;
    if (nextIdx >= currentPlaylistQueue.length) {
      return; // End of playlist
    }
    await playTrack(currentPlaylistQueue[nextIdx], currentPlaylistQueue, nextIdx);
  };

  // Play a track from user queue without changing playlist state
  const playTrackFromQueue = async (track) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.streamUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setCurrentTrack(track);
      setIsPlaying(true);
      incrementPlayCount(track);
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      });

      updateNotification(track, true);
    } catch (e) {
      console.log('Queue playback error:', e);
    }
  };

  const prevTrack = async () => {
    if (position > 3000) {
      await sound.setPositionAsync(0);
      return;
    }
    if (playlistQueue.length === 0 || playlistIndex <= 0) return;
    const prevIdx = playlistIndex - 1;
    await playTrack(playlistQueue[prevIdx], playlistQueue, prevIdx);
  };

  const seek = async (millis) => {
    if (sound) await sound.setPositionAsync(millis);
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  // Backward-compatible: expose queue and queueIndex as aliases for consumers
  // that still reference them (MiniPlayer, etc.)
  const queue = playlistQueue;
  const queueIndex = playlistIndex;

  return (
    <AudioContext.Provider value={{
      currentTrack, isPlaying, position, duration, 
      queue, queueIndex, playlistQueue, playlistIndex, userQueue,
      likedSongs, userPlaylists, pinnedPlaylistIds,
      repeatMode, isShuffle, activePlaylistId, isFullPlayerVisible,
      playCounts, toastMessage, toastVisible, notifications,
      sleepTimerEnd,
      setIsFullPlayerVisible, playTrack, togglePlay, nextTrack, prevTrack, seek, toggleLike, 
      addToQueue, removeFromUserQueue, clearUserQueue,
      addToPlaylist, removeFromPlaylist, createPlaylist, deletePlaylist, renamePlaylist, getTrackColor,
      togglePinPlaylist,
      toggleRepeat, toggleShuffle, getArtist,
      showToast, hideToast, incrementPlayCount, resetPlayCounts, clearCache,
      setSleepTimer, cancelSleepTimer, addNotification, clearNotifications,
    }}>
      {children}
    </AudioContext.Provider>
  );
};
