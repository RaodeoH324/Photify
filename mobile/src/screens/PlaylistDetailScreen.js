import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, StatusBar, Modal, TextInput } from 'react-native';
import { AudioContext } from '../AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SwipeableRow from '../components/SwipeableRow';

export default function PlaylistDetailScreen({ route, navigation }) {
  const { playlist, title: initialTitle, tracks: routeTracks } = route.params;
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isPlaylistSelectVisible, setPlaylistSelectVisible] = useState(false);
  const [isRenameVisible, setRenameVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const { 
    playTrack, getTrackColor, addToQueue, addToPlaylist,
    removeFromPlaylist: contextRemoveFromPlaylist, 
    userPlaylists, renamePlaylist, likedSongs, toggleLike
  } = useContext(AudioContext);

  // Get live data from context for local playlists (system or user-created)
  const livePlaylist = playlist.id === 'liked'
    ? { name: 'Liked Songs', tracks: likedSongs }
    : userPlaylists.find(p => p.id === playlist.id);

  const tracks = livePlaylist && livePlaylist.tracks ? livePlaylist.tracks : (routeTracks || []);
  const title = livePlaylist ? livePlaylist.name : initialTitle;

  const playlistColor = getTrackColor({ title: title || 'Playlist' });

  const handleTrackMenu = (track) => {
    setSelectedTrack(track);
    setMenuVisible(true);
  };

  const handleRemoveFromPlaylist = () => {
    if (playlist.id !== 'liked') {
      contextRemoveFromPlaylist(playlist.id, selectedTrack.id);
    }
    setMenuVisible(false);
  };

  const handleAddToQueue = () => {
    addToQueue(selectedTrack);
    setMenuVisible(false);
  };

  const handleAddToPlaylist = (playlistId) => {
    if (selectedTrack) {
      addToPlaylist(playlistId, selectedTrack);
    }
    setPlaylistSelectVisible(false);
    setMenuVisible(false);
  };

  const handleRename = () => {
    if (newName.trim()) {
      renamePlaylist(playlist.id, newName.trim());
      setRenameVisible(false);
      setNewName('');
    }
  };

  const openRenameModal = () => {
    setNewName(title);
    setRenameVisible(true);
  };

  const renderTrackItem = ({ item, index }) => (
    <SwipeableRow onSwipeRight={() => addToQueue(item)}>
      <TouchableOpacity 
        style={styles.trackItem}
        onPress={() => playTrack(item, tracks, index, playlist.id)}
      >
        <Image 
          source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')} 
          style={styles.trackCover} 
        />
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
        </View>
        <TouchableOpacity onPress={() => handleTrackMenu(item)} style={styles.dotsBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#b3b3b3" />
        </TouchableOpacity>
      </TouchableOpacity>
    </SwipeableRow>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[playlistColor, '#121212']}
        style={styles.gradient}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.headerRight}>
              {playlist.id !== 'liked' && !playlist.isSystem && !livePlaylist?.isSystem && (
                <TouchableOpacity onPress={openRenameModal} style={styles.headerBtn}>
                  <Ionicons name="create-outline" size={24} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => navigation.navigate('Main', { 
                  screen: 'Search', 
                  params: { addingToPlaylistId: playlist.id, addingToPlaylistName: title } 
                })} 
                style={styles.headerBtn}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

      <View style={styles.banner}>
        <View style={[styles.largeIcon, { backgroundColor: '#282828' }]}>
          <Ionicons name="musical-notes" size={60} color="#8A2BE2" />
        </View>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerSubtitle}>{tracks.length} songs</Text>
        
        {tracks.length > 0 && (
          <TouchableOpacity style={styles.playBtn} onPress={() => playTrack(tracks[0], tracks, 0, playlist.id)}>
            <Ionicons name="play" size={30} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={tracks}
        renderItem={renderTrackItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No songs in this playlist yet.</Text>
            <TouchableOpacity 
              style={styles.searchPrompt} 
              onPress={() => navigation.navigate('Main', { 
                screen: 'Search', 
                params: { addingToPlaylistId: playlist.id, addingToPlaylistName: title } 
              })}
            >
              <Text style={styles.searchPromptText}>Search and add songs</Text>
            </TouchableOpacity>
          </View>
        }
      />
        </SafeAreaView>
      </LinearGradient>
      
      {/* Track Options Modal */}
      <Modal visible={isMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.bottomMenu}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>{selectedTrack?.title}</Text>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleAddToQueue}>
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(138,43,226,0.15)' }]}>
                <Ionicons name="list" size={20} color="#BB86FC" />
              </View>
              <Text style={styles.menuText}>Add to queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setPlaylistSelectVisible(true)}>
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(29,185,84,0.15)' }]}>
                <Ionicons name="add-circle-outline" size={20} color="#1DB954" />
              </View>
              <Text style={styles.menuText}>Add to playlist</Text>
            </TouchableOpacity>
            {typeof playlist.id === 'number' && playlist.id !== 'liked' && (
              <TouchableOpacity style={styles.menuItem} onPress={handleRemoveFromPlaylist}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(255,68,68,0.15)' }]}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </View>
                <Text style={[styles.menuText, { color: '#ff4444' }]}>Remove from this playlist</Text>
              </TouchableOpacity>
            )}
            {playlist.id === 'liked' && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { toggleLike(selectedTrack); setMenuVisible(false); }}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(255,68,68,0.15)' }]}>
                  <Ionicons name="heart-dislike-outline" size={20} color="#ff4444" />
                </View>
                <Text style={[styles.menuText, { color: '#ff4444' }]}>Remove from Liked Songs</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Select Modal */}
      <Modal visible={isPlaylistSelectVisible} transparent animationType="fade">
        <View style={styles.playlistModalOverlay}>
          <View style={styles.playlistSelectBox}>
            <View style={styles.playlistSelectHeader}>
              <Ionicons name="musical-notes" size={24} color="#BB86FC" />
              <Text style={styles.playlistSelectTitle}>Select Playlist</Text>
            </View>
            <View style={styles.menuDivider} />
            {(userPlaylists || []).map(p => (
              <TouchableOpacity key={p.id} style={styles.playlistSelectItem} onPress={() => handleAddToPlaylist(p.id)}>
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(138,43,226,0.15)' }]}>
                  <Ionicons name="musical-notes" size={18} color="#BB86FC" />
                </View>
                <Text style={styles.menuText}>{p.name}</Text>
                <Ionicons name="chevron-forward" size={18} color="#444" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setPlaylistSelectVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Playlist Modal */}
      <Modal visible={isRenameVisible} transparent animationType="fade">
        <View style={styles.renameOverlay}>
          <View style={styles.renameContent}>
            <View style={styles.renameIconContainer}>
              <Ionicons name="create" size={32} color="#BB86FC" />
            </View>
            <Text style={styles.renameTitle}>Rename Playlist</Text>
            <TextInput
              style={styles.renameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter new name"
              placeholderTextColor="#555"
              autoFocus
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity style={styles.renameCancelBtn} onPress={() => setRenameVisible(false)}>
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.renameConfirmBtn} onPress={handleRename}>
                <Text style={styles.renameConfirmText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  banner: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  largeIcon: {
    width: 180,
    height: 180,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#b3b3b3',
    fontSize: 14,
    marginBottom: 20,
  },
  playBtn: {
    backgroundColor: '#1DB954',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: -28,
    right: 20,
    elevation: 10,
  },
  listContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  trackCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  trackArtist: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
    opacity: 0.85,
  },
  dotsBtn: {
    padding: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
  },
  searchPrompt: {
    backgroundColor: '#282828',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  searchPromptText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  bottomMenu: {
    backgroundColor: '#1e1e1e',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    marginBottom: 16,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  // Playlist select modal
  playlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistSelectBox: {
    backgroundColor: '#1e1e1e',
    width: '85%',
    borderRadius: 20,
    padding: 24,
    maxHeight: '60%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playlistSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  playlistSelectTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  playlistSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  closeBtn: {
    marginTop: 16,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#b3b3b3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Rename modal
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  renameContent: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  renameIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(187,134,252,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  renameTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  renameInput: {
    color: '#fff',
    fontSize: 18,
    width: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  renameButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  renameCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
    alignItems: 'center',
  },
  renameCancelText: {
    color: '#b3b3b3',
    fontSize: 16,
    fontWeight: '600',
  },
  renameConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8A2BE2',
    marginLeft: 8,
    alignItems: 'center',
  },
  renameConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
