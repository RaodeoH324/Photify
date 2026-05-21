import React, { useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { AudioContext } from '../AudioContext';
import { Ionicons } from '@expo/vector-icons';

export default function QueueScreen({ navigation }) {
  const { 
    currentTrack, userQueue, playlistQueue, playlistIndex, 
    removeFromUserQueue, clearUserQueue, playTrack, getTrackColor, getArtist
  } = useContext(AudioContext);

  const bgColor = currentTrack ? getTrackColor(currentTrack) : '#121212';

  // Upcoming playlist tracks (after current index)
  const upcomingPlaylist = playlistQueue.slice(playlistIndex + 1, playlistIndex + 21);

  const renderQueueItem = ({ item, index }) => (
    <View style={styles.queueItem}>
      <Text style={styles.queueNumber}>{index + 1}</Text>
      <Image
        source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')}
        style={styles.queueCover}
      />
      <View style={styles.queueInfo}>
        <Text style={styles.queueTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.queueArtist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
      </View>
      <TouchableOpacity onPress={() => removeFromUserQueue(index)} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={22} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  const renderPlaylistItem = ({ item, index }) => (
    <View style={styles.queueItem}>
      <Text style={[styles.queueNumber, { color: '#555' }]}>{index + 1}</Text>
      <Image
        source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')}
        style={styles.queueCover}
      />
      <View style={styles.queueInfo}>
        <Text style={[styles.queueTitle, { color: '#aaa' }]} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.queueArtist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View>
            {/* Now Playing Section */}
            {currentTrack && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>NOW PLAYING</Text>
                <View style={[styles.nowPlayingCard, { borderLeftColor: bgColor }]}>
                  <Image
                    source={currentTrack.coverUrl ? { uri: currentTrack.coverUrl } : require('../../assets/icon.png')}
                    style={styles.nowPlayingCover}
                  />
                  <View style={styles.nowPlayingInfo}>
                    <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentTrack.title}</Text>
                    <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                      {getArtist(currentTrack) || 'Unknown Artist'}
                    </Text>
                  </View>
                  <View style={styles.nowPlayingBars}>
                    <View style={[styles.barAnim, { height: 12 }]} />
                    <View style={[styles.barAnim, { height: 18 }]} />
                    <View style={[styles.barAnim, { height: 8 }]} />
                  </View>
                </View>
              </View>
            )}

            {/* User Queue Section */}
            {userQueue.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>NEXT IN QUEUE</Text>
                  <TouchableOpacity onPress={clearUserQueue} style={styles.clearBtn}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.queueBadge}>
                  <Ionicons name="list" size={14} color="#8A2BE2" />
                  <Text style={styles.queueBadgeText}>{userQueue.length} song{userQueue.length !== 1 ? 's' : ''} queued</Text>
                </View>
                {userQueue.map((item, index) => (
                  <View key={`uq-${index}-${item.id}`} style={styles.queueItem}>
                    <Text style={styles.queueNumber}>{index + 1}</Text>
                    <Image
                      source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')}
                      style={styles.queueCover}
                    />
                    <View style={styles.queueInfo}>
                      <Text style={styles.queueTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.queueArtist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeFromUserQueue(index)} style={styles.removeBtn}>
                      <Ionicons name="close-circle" size={22} color="rgba(255,68,68,0.7)" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Upcoming from Playlist */}
            {upcomingPlaylist.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>NEXT FROM PLAYLIST</Text>
                {upcomingPlaylist.map((item, index) => (
                  <View key={`pl-${index}-${item.id}`} style={styles.queueItem}>
                    <Text style={[styles.queueNumber, { color: '#555' }]}>{index + 1}</Text>
                    <Image
                      source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')}
                      style={styles.queueCover}
                    />
                    <View style={styles.queueInfo}>
                      <Text style={[styles.queueTitle, { color: '#aaa' }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.queueArtist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {userQueue.length === 0 && upcomingPlaylist.length === 0 && !currentTrack && (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={64} color="#333" />
                <Text style={styles.emptyTitle}>Your queue is empty</Text>
                <Text style={styles.emptySubtitle}>Swipe a song right or tap the menu to add songs here</Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(138,43,226,0.15)',
    marginBottom: 12,
  },
  clearBtnText: {
    color: '#BB86FC',
    fontSize: 12,
    fontWeight: '600',
  },
  queueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138,43,226,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  queueBadgeText: {
    color: '#BB86FC',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Now Playing card
  nowPlayingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  nowPlayingCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nowPlayingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nowPlayingArtist: {
    color: '#888',
    fontSize: 13,
    marginTop: 3,
  },
  nowPlayingBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginLeft: 8,
  },
  barAnim: {
    width: 3,
    backgroundColor: '#8A2BE2',
    borderRadius: 1,
  },
  // Queue items
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  queueNumber: {
    color: '#8A2BE2',
    fontSize: 14,
    fontWeight: 'bold',
    width: 28,
    textAlign: 'center',
  },
  queueCover: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 12,
  },
  queueInfo: {
    flex: 1,
  },
  queueTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  queueArtist: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
