import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, ScrollView, FlatList, Modal } from 'react-native';
import { AudioContext } from '../AudioContext';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

const JAI_AASHYASHAKTI_LYRICS = [
  { time: 0, text: "जय आद्या शक्ति," },
  { time: 3000, text: "माँ जय आद्या शक्ति," },
  { time: 6000, text: "अखंड ब्रह्माण्ड दीपाव्यां" },
  { time: 9000, text: "पडवे प्रगटतया माँ" },
  { time: 12000, text: "ॐ जयो जयो माँ जगदम्बे ||" },
  { time: 18000, text: "द्वितीय मेहस्वरूप, शिवशक्ति जाणुं," },
  { time: 21000, text: "माँ शिवशक्ति जाणुं," },
  { time: 24000, text: "ब्रह्मा गणपती गावो" },
  { time: 27000, text: "हरे गावो हर माँ" },
  { time: 30000, text: "ॐ जयो जयो माँ जगदम्बे ||" },
  { time: 36000, text: "तृतीया त्रण सरूप त्रिभुवनमां बेठा," },
  { time: 39000, text: "माँ त्रिभुवनमां बेठा," },
  { time: 42000, text: "दय थकी तरवेणी" },
  { time: 45000, text: "तमे तरवेणी माँ" },
  { time: 48000, text: "ॐ जयो जयो माँ जगदम्बे ||" },
  { time: 54000, text: "चोथे चतुरा महालक्ष्मी माँ सचराचरव्याप्या," },
  { time: 57000, text: "माँ सचराचरव्याप्या," },
  { time: 60000, text: "चार भुजा चौ दिशा" },
  { time: 63000, text: "प्रगट्या दक्षिणमां" },
  { time: 66000, text: "ॐ जयो जयो माँ जगदम्बे ||" },
  // ... adding more as placeholders, user can provide specific times
];

export default function PlayerScreen({ navigation }) {
  const { 
    currentTrack, isPlaying, position, duration, likedSongs,
    togglePlay, nextTrack, prevTrack, seek, toggleLike, getTrackColor, getArtist,
    repeatMode, isShuffle, toggleRepeat, toggleShuffle, setIsFullPlayerVisible,
    addToQueue, addToPlaylist, userPlaylists, playCounts
  } = useContext(AudioContext);

  useEffect(() => {
    setIsFullPlayerVisible(true);
    return () => setIsFullPlayerVisible(false);
  }, []);

  const [activeLyricIndex, setActiveLyricIndex] = useState(0);
  const lyricsListRef = useRef(null);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isPlaylistSelectVisible, setPlaylistSelectVisible] = useState(false);
  const [isFullLyricsVisible, setFullLyricsVisible] = useState(false);

  const isLiked = useMemo(() => 
    currentTrack && likedSongs.some(s => s.id === currentTrack.id),
  [currentTrack, likedSongs]);

  const bgColor = useMemo(() => {
    return getTrackColor(currentTrack || { title: 'Unknown' });
  }, [currentTrack]);

  const parseLRC = (lrc) => {
    if (!lrc) return null;
    const lines = lrc.split('\n');
    const lyrics = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    lines.forEach(line => {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const ms = parseInt(match[3].padEnd(3, '0'));
        const time = (minutes * 60 + seconds) * 1000 + ms;
        const text = line.replace(timeRegex, '').trim();
        if (text) lyrics.push({ time, text });
      }
    });
    
    return lyrics.length > 0 ? lyrics : null;
  };

  const lyrics = useMemo(() => {
    if (!currentTrack || !currentTrack.lyrics) return null;
    
    // Check if it's already an array (old hardcoded style)
    if (Array.isArray(currentTrack.lyrics)) return currentTrack.lyrics;
    
    // Try to parse as LRC first
    const parsed = parseLRC(currentTrack.lyrics);
    if (parsed) return parsed;
    
    // If not LRC, treat as plain text and split into lines
    const lines = currentTrack.lyrics.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return null;

    // Estimate timings if we have a duration
    if (duration > 0) {
      const lineDuration = duration / lines.length;
      return lines.map((text, i) => ({
        time: i * lineDuration,
        text: text.trim()
      }));
    }

    // Fallback: just show lines without sync
    return lines.map(text => ({ time: 0, text: text.trim() }));
  }, [currentTrack, duration]);

  const isSyncLyrics = lyrics && lyrics.length > 1;

  const handleRepeatPress = () => {
    // Cycle: Off (0) → Repeat Once (1, green) → Infinite Loop (2, purple) → Off (0)
    toggleRepeat();
  };

  useEffect(() => {
    if (isSyncLyrics) {
      const index = lyrics.findIndex((l, i) => {
        const nextTime = lyrics[i + 1]?.time || Infinity;
        return position >= l.time && position < nextTime;
      });
      if (index !== -1 && index !== activeLyricIndex) {
        setActiveLyricIndex(index);
        lyricsListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }
    }
  }, [position, lyrics, isSyncLyrics]);

  // Three-dots menu handlers
  const handleAddToQueue = () => {
    if (currentTrack) {
      addToQueue(currentTrack);
    }
    setMenuVisible(false);
  };

  const handleAddToPlaylist = (playlistId) => {
    if (currentTrack) {
      addToPlaylist(playlistId, currentTrack);
    }
    setPlaylistSelectVisible(false);
    setMenuVisible(false);
  };

  // Get play count for current track
  const currentPlayCount = currentTrack && playCounts[currentTrack.id] 
    ? playCounts[currentTrack.id].count 
    : 0;

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyText}>Not Playing</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressPct = duration > 0 ? (position / duration) : 0;

  const displayArtist = getArtist ? getArtist(currentTrack) : (currentTrack.artist || 'Unknown Artist');

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.darkOverlay}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-down" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Now Playing</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.albumArtContainer}>
              <Image 
                source={currentTrack.coverUrl ? { uri: currentTrack.coverUrl } : require('../../assets/icon.png')} 
                style={styles.albumArt} 
              />
            </View>

            <View style={styles.trackInfoContainer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{displayArtist}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleLike(currentTrack)}>
                <Ionicons 
                  name={isLiked ? "heart" : "heart-outline"} 
                  size={32} 
                  color={isLiked ? "#1DB954" : "#fff"} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <Slider
                style={styles.slider}
                value={position}
                minimumValue={0}
                maximumValue={duration || 1}
                minimumTrackTintColor="#1DB954"
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor="#fff"
                onSlidingComplete={seek}
              />
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>

            <View style={styles.controlsContainer}>
              <TouchableOpacity onPress={toggleShuffle}>
                <Ionicons 
                  name="shuffle" 
                  size={28} 
                  color={isShuffle ? "#1DB954" : "#fff"} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={prevTrack}>
                <Ionicons name="play-skip-back" size={42} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playPauseBtn} onPress={togglePlay}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextTrack}>
                <Ionicons name="play-skip-forward" size={42} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRepeatPress}>
                <Ionicons 
                  name="repeat" 
                  size={28} 
                  color={repeatMode === 1 ? "#1DB954" : repeatMode === 2 ? "#BB86FC" : "#fff"} 
                />
                {repeatMode === 2 && (
                  <View style={styles.repeatBadge}>
                    <Text style={styles.repeatBadgeText}>∞</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>


            <TouchableOpacity 
              style={styles.lyricsContainer} 
              activeOpacity={0.9}
              onPress={() => setFullLyricsVisible(true)}
            >
              <View style={styles.lyricsHeaderRow}>
                <Text style={styles.lyricsHeader}>Lyrics</Text>
                <Ionicons name="expand-outline" size={18} color="rgba(255,255,255,0.6)" />
              </View>
              {lyrics ? (
                <FlatList
                  ref={lyricsListRef}
                  data={lyrics}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <Text style={[
                      styles.lyricLine,
                      isSyncLyrics && index === activeLyricIndex && styles.activeLyricLine,
                      !isSyncLyrics && styles.plainLyricLine
                    ]}>
                      {item.text}
                    </Text>
                  )}
                  scrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  initialNumToRender={12}
                  style={{ maxHeight: 200 }}
                />
              ) : (
                <Text style={styles.lyricsText}>
                  Lyrics for "{currentTrack.title}" are not available yet.
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Three-dots Menu Modal */}
      <Modal visible={isMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.bottomMenu}>
            <View style={styles.menuHandle} />
            <View style={styles.menuTrackInfo}>
              <Image 
                source={currentTrack.coverUrl ? { uri: currentTrack.coverUrl } : require('../../assets/icon.png')} 
                style={styles.menuCover} 
              />
              <View style={styles.menuTrackDetails}>
                <Text style={styles.menuTitle} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.menuArtist} numberOfLines={1}>{displayArtist}</Text>
              </View>
            </View>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleAddToQueue}>
              <View style={styles.menuIconBg}>
                <Ionicons name="list" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Add to queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setPlaylistSelectVisible(true); }}>
              <View style={styles.menuIconBg}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Add to playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { toggleLike(currentTrack); setMenuVisible(false); }}>
              <View style={[styles.menuIconBg, isLiked && { backgroundColor: 'rgba(29,185,84,0.3)' }]}>
                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#1DB954" : "#fff"} />
              </View>
              <Text style={styles.menuText}>{isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <View style={styles.menuIconBg}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.menuText}>Share</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Select Modal */}
      <Modal visible={isPlaylistSelectVisible} transparent animationType="fade">
        <View style={styles.playlistModalOverlay}>
          <View style={styles.playlistSelectBox}>
            <Text style={styles.playlistSelectTitle}>Select Playlist</Text>
            {(userPlaylists || []).map(p => (
              <TouchableOpacity key={p.id} style={styles.playlistOption} onPress={() => handleAddToPlaylist(p.id)}>
                <Ionicons name="musical-notes" size={20} color="#8A2BE2" />
                <Text style={styles.playlistOptionText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            {(!userPlaylists || userPlaylists.length === 0) && (
              <Text style={styles.noPlaylistText}>No playlists yet. Create one in Library.</Text>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setPlaylistSelectVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Screen Lyrics Modal */}
      <Modal visible={isFullLyricsVisible} transparent animationType="slide">
        <View style={[styles.fullLyricsModal, { backgroundColor: bgColor }]}>
          <View style={styles.darkOverlay}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullLyricsTitle} numberOfLines={1}>{currentTrack.title}</Text>
                  <Text style={styles.fullLyricsArtist} numberOfLines={1}>{displayArtist}</Text>
                </View>
                <TouchableOpacity onPress={() => setFullLyricsVisible(false)} style={styles.closeFullLyrics}>
                  <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.fullLyricsScroll}
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 30 }}
                showsVerticalScrollIndicator={false}
              >
                {lyrics ? lyrics.map((l, i) => (
                  <Text key={i} style={[
                    styles.lyricLine,
                    { fontSize: 24, lineHeight: 36, marginBottom: 20 },
                    isSyncLyrics && i === activeLyricIndex && styles.activeLyricLine,
                  ]}>
                    {l.text}
                  </Text>
                )) : (
                  <Text style={styles.lyricsText}>Lyrics not available.</Text>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  albumArtContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    marginVertical: 20,
  },
  albumArt: {
    width: width - 60,
    height: width - 60,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  trackInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  repeatBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#BB86FC',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playPauseBtn: {
    width: 70,
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  playCountText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 6,
  },
  lyricsContainer: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    minHeight: 150,
  },
  lyricsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  lyricsHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lyricsText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600',
  },
  lyricLine: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    lineHeight: 30,
    marginBottom: 10,
    fontWeight: '600',
  },
  activeLyricLine: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  plainLyricLine: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    fontWeight: 'normal',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
  },
  // Three-dots modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  bottomMenu: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  menuHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuTrackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuCover: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  menuTrackDetails: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuArtist: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  // Playlist select modal
  playlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistSelectBox: {
    backgroundColor: '#1e1e1e',
    width: '80%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '60%',
  },
  playlistSelectTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  playlistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  playlistOptionText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 12,
  },
  noPlaylistText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  closeBtn: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
  },
  closeBtnText: {
    color: '#8A2BE2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Full Lyrics
  fullLyricsModal: {
    flex: 1,
  },
  fullLyricsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fullLyricsArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  fullLyricsScroll: {
    flex: 1,
    marginTop: 20,
  },
  closeFullLyrics: {
    padding: 10,
  },
  repeatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#BB86FC',
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
  }
});
