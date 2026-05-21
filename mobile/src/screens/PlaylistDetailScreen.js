import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, StatusBar, Modal } from 'react-native';
import { AudioContext } from '../AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SwipeableRow from '../components/SwipeableRow';

export default function PlaylistDetailScreen({ route, navigation }) {
  const { playlist, title, tracks } = route.params;
  const [selectedTrack, setSelectedTrack] = React.useState(null);
  const [isMenuVisible, setMenuVisible] = React.useState(false);
  const { playTrack, getTrackColor, addToQueue, removeFromPlaylist: contextRemoveFromPlaylist } = useContext(AudioContext);

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
            <Text style={styles.menuTitle}>{selectedTrack?.title}</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleAddToQueue}>
              <Ionicons name="list" size={22} color="#fff" />
              <Text style={styles.menuText}>Add to queue</Text>
            </TouchableOpacity>
            {typeof playlist.id === 'number' && playlist.id !== 'liked' && (
              <TouchableOpacity style={styles.menuItem} onPress={handleRemoveFromPlaylist}>
                <Ionicons name="trash-outline" size={22} color="#ff4444" />
                <Text style={[styles.menuText, { color: '#ff4444' }]}>Remove from this playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  bottomMenu: {
    backgroundColor: '#282828',
    width: '100%',
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
});
