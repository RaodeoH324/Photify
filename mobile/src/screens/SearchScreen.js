import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ScrollView, SafeAreaView, Modal } from 'react-native';
import { fetchTracksFromDrive } from '../api';
import { AudioContext } from '../AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import SwipeableRow from '../components/SwipeableRow';

const GENRES = [
  { name: 'Bollywood', color: '#E8115B' },
  { name: 'Classical', color: '#1E3264' },
  { name: 'Ghazal', color: '#8D67AB' },
  { name: 'Bhajan', color: '#E13300' },
  { name: 'Qawwali', color: '#7358FF' },
  { name: 'Punjabi', color: '#148A08' },
  { name: 'Marathi', color: '#BC5900' },
  { name: 'Tamil', color: '#509BF5' },
  { name: 'Telugu', color: '#D84000' },
  { name: 'Malayalam', color: '#537AA1' },
  { name: 'Bengali', color: '#777777' },
];


export default function SearchScreen({ route }) {
  const params = route.params || {};
  const { addingToPlaylistId, addingToPlaylistName } = params;
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [allTracks, setAllTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isPlaylistSelectVisible, setPlaylistSelectVisible] = useState(false);

  const { playTrack, addToQueue, addToPlaylist, userPlaylists } = useContext(AudioContext);
  
  const targetPlaylist = userPlaylists.find(p => p.id === addingToPlaylistId);

  const isInTarget = (trackId) => {
    if (!targetPlaylist) return false;
    return targetPlaylist.tracks.some(t => t.id === trackId);
  };

  const handleDone = () => {
    navigation.setParams({ addingToPlaylistId: null, addingToPlaylistName: null });
    navigation.goBack();
  };

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    const tracks = await fetchTracksFromDrive();
    setAllTracks(tracks);
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTracks(allTracks);
    } else {
      const filtered = allTracks.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTracks(filtered);
    }
  }, [searchQuery, allTracks]);

  const selectGenre = (genre) => {
    const genreTracks = allTracks.filter(t => t.genre === genre);
    navigation.navigate('PlaylistDetail', {
      playlist: { id: `genre_${genre}`, name: genre },
      title: genre,
      tracks: genreTracks
    });
  };

  const handleTrackMenu = (track) => {
    setSelectedTrack(track);
    setMenuVisible(true);
  };

  const handleAddToQueue = () => {
    addToQueue(selectedTrack);
    setMenuVisible(false);
  };

  const handleAddToPlaylist = (playlistId, track = null) => {
    const trackToAdd = track || selectedTrack;
    if (trackToAdd) {
      addToPlaylist(playlistId, trackToAdd);
    }
    setPlaylistSelectVisible(false);
    setMenuVisible(false);
  };

  const cleanTitle = (title) => {
    return title.replace(/_-_/g, ' - ').replace(/_\(mp3\.pm\)/gi, '').replace(/_/g, ' ');
  };


  const renderTrackItem = ({ item, index }) => {
    const displayArtist = item.artist;
    const added = isInTarget(item.id);

    return (
      <SwipeableRow onSwipeRight={() => addToQueue(item)}>
        <View style={styles.trackItemContainer}>
          <TouchableOpacity 
            style={styles.trackItem}
            onPress={() => playTrack(item, filteredTracks, index)}
          >
            <Image 
              source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')} 
              style={styles.trackCover} 
            />
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>{cleanTitle(item.title)}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>{displayArtist}</Text>
            </View>
          </TouchableOpacity>

          {addingToPlaylistId ? (
            <TouchableOpacity 
              onPress={() => !added && handleAddToPlaylist(addingToPlaylistId, item)}
              style={[styles.addBtn, added && styles.addedBtn]}
            >
              <Ionicons 
                name={added ? "checkmark-circle" : "add-circle-outline"} 
                size={28} 
                color={added ? "#1DB954" : "#fff"} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => handleTrackMenu(item)} style={styles.dotsBtn}>
              <Ionicons name="ellipsis-vertical" size={20} color="#b3b3b3" />
            </TouchableOpacity>
          )}
        </View>
      </SwipeableRow>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      {addingToPlaylistId && (
        <View style={styles.addModeHeader}>
          <View>
            <Text style={styles.addModeLabel}>Adding to playlist</Text>
            <Text style={styles.addModeTitle}>{addingToPlaylistName}</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{addingToPlaylistId ? 'Add Songs' : 'Search'}</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#000" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to listen to?"
            placeholderTextColor="#777"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#777" />
            </TouchableOpacity>
          )}
        </View>

      </View>

      {(searchQuery.trim() !== '' || addingToPlaylistId) ? (
        <FlatList
          data={filteredTracks}
          renderItem={renderTrackItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery.trim() !== '' 
                  ? `No results found for "${searchQuery}"`
                  : "No songs found."}
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Browse Genres</Text>
          <View style={styles.genreGrid}>
            {GENRES.map((genre) => (
              <TouchableOpacity 
                key={genre.name} 
                style={[styles.genreCard, { backgroundColor: genre.color }]}
                onPress={() => selectGenre(genre.name)}
              >
                <Text style={styles.genreText}>{genre.name}</Text>
                <View style={styles.genreImagePlaceholder}>
                  <Text style={styles.genreImageIcon}>♪</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Track Options Modal */}
      <Modal visible={isMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.bottomMenu}>
            <Text style={styles.menuTitle}>{selectedTrack?.title}</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleAddToQueue}>
              <Ionicons name="list" size={22} color="#fff" />
              <Text style={styles.menuText}>Add to queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setPlaylistSelectVisible(true)}>
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.menuText}>Add to playlist</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Select Modal */}
      <Modal visible={isPlaylistSelectVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.playlistSelectBox}>
            <Text style={styles.menuTitle}>Select Playlist</Text>
            {(userPlaylists || []).map(p => (
              <TouchableOpacity key={p.id} style={styles.menuItem} onPress={() => handleAddToPlaylist(p.id)}>
                <Text style={styles.menuText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setPlaylistSelectVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    paddingTop: 20,
  },
  addModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#282828',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  addModeLabel: {
    color: '#b3b3b3',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  addModeTitle: {
    color: '#1DB954',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneBtnText: {
    color: '#000',
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  genreCard: {
    width: '48%',
    height: 100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  genreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  genreImagePlaceholder: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    transform: [{ rotate: '25deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreImageIcon: {
    fontSize: 30,
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  trackItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  trackInfo: {
    marginLeft: 12,
    flex: 1,
  },
  addBtn: {
    padding: 8,
  },
  addedBtn: {
    opacity: 0.8,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  trackArtist: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  dotsBtn: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomMenu: {
    backgroundColor: '#282828',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  playlistSelectBox: {
    backgroundColor: '#282828',
    width: '80%',
    borderRadius: 12,
    padding: 20,
    maxHeight: '60%',
  },
  closeBtn: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
  },
  closeBtnText: {
    color: '#8A2BE2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

