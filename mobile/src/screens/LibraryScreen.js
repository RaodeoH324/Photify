import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, Modal, TextInput, Alert, Animated } from 'react-native';
import * as Sharing from 'expo-sharing';
import { AudioContext } from '../AudioContext';
import { Ionicons } from '@expo/vector-icons';

const PlayingIndicator = ({ isPlaying }) => {
  const bar1 = React.useRef(new Animated.Value(0.3)).current;
  const bar2 = React.useRef(new Animated.Value(0.6)).current;
  const bar3 = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    if (isPlaying) {
      const animate = (val, to, duration) => {
        Animated.sequence([
          Animated.timing(val, { toValue: to, duration, useNativeDriver: false }),
          Animated.timing(val, { toValue: 0.2, duration, useNativeDriver: false })
        ]).start(() => isPlaying && animate(val, to, duration));
      };
      animate(bar1, 1, 400);
      animate(bar2, 0.8, 500);
      animate(bar3, 0.9, 450);
    } else {
      bar1.setValue(0.3);
      bar2.setValue(0.3);
      bar3.setValue(0.3);
    }
  }, [isPlaying]);

  return (
    <View style={styles.indicatorContainer}>
      <Animated.View style={[styles.bar, { height: bar1.interpolate({ inputRange: [0, 1], outputRange: ['20%', '100%'] }) }]} />
      <Animated.View style={[styles.bar, { height: bar2.interpolate({ inputRange: [0, 1], outputRange: ['20%', '100%'] }) }]} />
      <Animated.View style={[styles.bar, { height: bar3.interpolate({ inputRange: [0, 1], outputRange: ['20%', '100%'] }) }]} />
    </View>
  );
};

export default function LibraryScreen({ navigation }) {
  const [isModalVisible, setModalVisible] = useState(false);
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const { 
    likedSongs, userPlaylists, pinnedPlaylistIds, 
    createPlaylist, deletePlaylist, togglePinPlaylist, 
    getTrackColor, activePlaylistId, isPlaying 
  } = useContext(AudioContext);

  const openPlaylist = (playlist) => {
    let tracks = playlist.id === 'liked' ? likedSongs : (playlist.tracks || []);
    navigation.navigate('PlaylistDetail', {
      playlist: playlist,
      title: playlist.name,
      tracks: tracks
    });
  };

  const handleCreate = async () => {
    if (newPlaylistName.trim()) {
      setModalVisible(false);
      await createPlaylist(newPlaylistName);
      setNewPlaylistName('');
    }
  };

  const openOptions = (playlist) => {
    setSelectedPlaylist(playlist);
    setOptionsVisible(true);
  };

  const handleTogglePin = () => {
    if (selectedPlaylist) {
      togglePinPlaylist(selectedPlaylist.id);
      setOptionsVisible(false);
    }
  };

  const handleShare = async () => {
    if (selectedPlaylist) {
      setOptionsVisible(false);
      if (!(await Sharing.isAvailableAsync())) {
        alert("Sharing is not available on this platform");
        return;
      }
      await Sharing.shareAsync('https://photify.app/playlist/' + selectedPlaylist.id, {
        dialogTitle: 'Share ' + selectedPlaylist.name
      });
    }
  };

  const handleDelete = () => {
    if (selectedPlaylist) {
      setOptionsVisible(false);
      setTimeout(() => {
        setDeleteModalVisible(true);
      }, 300);
    }
  };

  const confirmDelete = () => {
    if (selectedPlaylist) {
      deletePlaylist(selectedPlaylist.id);
      setDeleteModalVisible(false);
    }
  };

  const renderPlaylistItem = ({ item }) => {
    const isLiked = item.id === 'liked';
    const bgColor = isLiked ? '#450af5' : getTrackColor({ title: item.name });
    const isActive = activePlaylistId === item.id;
    const isPinned = pinnedPlaylistIds.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.playlistItem}
        onPress={() => openPlaylist(item)}
        onLongPress={() => openOptions(item)}
        delayLongPress={500}
      >
        <View style={[styles.playlistImage, { backgroundColor: bgColor }]}>
          {isLiked ? (
            <Ionicons name="heart" size={32} color="#fff" />
          ) : (
            <Ionicons name="musical-notes" size={28} color="rgba(255,255,255,0.7)" />
          )}
        </View>
        <View style={styles.playlistInfo}>
          <View style={styles.playlistNameRow}>
            {isPinned && <Ionicons name="pin" size={14} color="#1DB954" style={{ marginRight: 6 }} />}
            <Text style={[styles.playlistName, isActive && { color: '#1DB954' }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <Text style={styles.playlistDetails}>
            Playlist • {isLiked ? likedSongs.length : (item.tracks?.length || 0)} songs
          </Text>
        </View>
        <View style={styles.playlistAction}>
          {isActive ? (
            <PlayingIndicator isPlaying={isPlaying} />
          ) : (
            <TouchableOpacity onPress={() => openOptions(item)} style={{ padding: 10 }}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#b3b3b3" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const allLibraryItems = [{ id: 'liked', name: 'Liked Songs', tracks: likedSongs }, ...userPlaylists];
  
  const sortedItems = [...allLibraryItems].sort((a, b) => {
    const aPinned = pinnedPlaylistIds.includes(a.id);
    const bPinned = pinnedPlaylistIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedItems}
        renderItem={renderPlaylistItem}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your library is empty.</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
            <View style={styles.addIconContainer}>
              <Ionicons name="add" size={30} color="#b3b3b3" />
            </View>
            <Text style={styles.createBtnText}>Create new playlist</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={styles.listContent}
      />

      {/* New Playlist Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="add-circle" size={32} color="#BB86FC" />
            </View>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Give your playlist a name"
              placeholderTextColor="#555"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtnModal} onPress={handleCreate}>
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Options Modal */}
      <Modal visible={isOptionsVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.optionsOverlay} 
          activeOpacity={1} 
          onPress={() => setOptionsVisible(false)}
        >
          <View style={styles.optionsContent}>
            <View style={styles.optionsHeader}>
              <View style={[styles.optionsImage, { backgroundColor: getTrackColor({ title: selectedPlaylist?.name || '' }) }]}>
                <Ionicons name="musical-notes" size={24} color="#fff" />
              </View>
              <Text style={styles.optionsTitle} numberOfLines={1}>{selectedPlaylist?.name}</Text>
            </View>

            <TouchableOpacity style={styles.optionItem} onPress={handleTogglePin}>
              <Ionicons 
                name={pinnedPlaylistIds.includes(selectedPlaylist?.id) ? "pin" : "pin-outline"} 
                size={22} 
                color="#fff" 
              />
              <Text style={styles.optionText}>
                {pinnedPlaylistIds.includes(selectedPlaylist?.id) ? 'Unpin playlist' : 'Pin playlist'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="#fff" />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>

            {selectedPlaylist?.id !== 'liked' && (
              <TouchableOpacity style={styles.optionItem} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color="#ff4444" />
                <Text style={[styles.optionText, { color: '#ff4444' }]}>Delete Playlist</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.optionsClose} 
              onPress={() => setOptionsVisible(false)}
            >
              <Text style={styles.optionsCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash" size={32} color="#ff4444" />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Playlist?</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete <Text style={{fontWeight: 'bold', color: '#fff'}}>"{selectedPlaylist?.name}"</Text>? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={styles.cancelDeleteBtn} 
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelDeleteBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmDeleteBtn} 
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  icon: {
    marginLeft: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  playlistImage: {
    width: 64,
    height: 64,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistImageText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  playlistInfo: {
    marginLeft: 16,
    flex: 1,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  playlistDetails: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 4,
  },
  playlistAction: {
    paddingHorizontal: 8,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: 14,
    height: 14,
  },
  bar: {
    width: 3,
    backgroundColor: '#1DB954',
    borderRadius: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 4,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
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
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(187,134,252,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
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
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#b3b3b3',
    fontSize: 16,
    fontWeight: '600',
  },
  createBtnModal: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8A2BE2',
    marginLeft: 8,
    alignItems: 'center',
  },
  createText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playlistNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  optionsContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  optionsImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '500',
  },
  optionsClose: {
    marginTop: 16,
    alignItems: 'center',
    padding: 16,
  },
  optionsCloseText: {
    color: '#b3b3b3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  deleteModalText: {
    color: '#b3b3b3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  cancelDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelDeleteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
