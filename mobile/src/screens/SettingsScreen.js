import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioContext } from '../AudioContext';
import { AuthContext } from '../AuthContext';
import AestheticAlert from '../components/AestheticAlert';

export default function SettingsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { playCounts, clearCache } = useContext(AudioContext);
  const [showPlayCounts, setShowPlayCounts] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  const sortedPlayCounts = Object.entries(playCounts || {})
    .map(([trackId, data]) => ({
      id: trackId,
      title: data.title || 'Unknown',
      artist: data.artist || 'Unknown Artist',
      count: data.count || 0,
      coverUrl: data.coverUrl || null,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const handleClearCache = () => {
    setAlertConfig({
      title: 'Clear Cache & Reload',
      message: 'This will clear cached track data and re-fetch everything from Google Drive. Your playlists and liked songs will not be affected.',
      type: 'warning',
      confirmText: 'Clear & Reload',
      cancelText: 'Cancel',
      onConfirm: () => {
        clearCache();
        setAlertConfig({
          title: 'Done',
          message: 'Cache cleared! Pull down to refresh on the Home screen to reload your library.',
          type: 'success',
          confirmText: 'OK',
          onConfirm: () => setAlertVisible(false)
        });
      },
      onClose: () => setAlertVisible(false)
    });
    setAlertVisible(true);
  };


  // Spotify-like settings items
  const settingsItems = [
    {
      icon: 'brush-outline',
      iconColor: '#8A2BE2',
      iconBg: 'rgba(138,43,226,0.2)',
      title: 'Content and display',
      subtitle: 'Canvas • Languages for music',
      type: 'content',
    },
    {
      icon: 'lock-closed-outline',
      iconColor: '#1DB954',
      iconBg: 'rgba(29,185,84,0.2)',
      title: 'Privacy and social',
      subtitle: 'Private session • Public playlists',
      type: 'social',
    },
    {
      icon: 'notifications-outline',
      iconColor: '#FFA726',
      iconBg: 'rgba(255,167,38,0.2)',
      title: 'Notifications',
      subtitle: 'Push • Email',
      type: 'notifications',
    },
    {
      icon: 'phone-portrait-outline',
      iconColor: '#42A5F5',
      iconBg: 'rgba(66,165,245,0.2)',
      title: 'Apps and devices',
      subtitle: 'Connected apps • Device control',
      type: 'apps',
    },
    {
      icon: 'cloud-download-outline',
      iconColor: '#AB47BC',
      iconBg: 'rgba(171,71,188,0.2)',
      title: 'Data-saving and offline',
      subtitle: 'Data Saver mode • Downloads over cellular',
      type: 'data',
    },
    {
      icon: 'stats-chart-outline',
      iconColor: '#EF5350',
      iconBg: 'rgba(239,83,80,0.2)',
      title: 'Media quality',
      subtitle: 'Wi-Fi streaming quality • Audio download quality',
      type: 'quality',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.accountCard}>
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitial}>{user?.name?.[0] || 'U'}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.name || 'User'}</Text>
              <Text style={styles.accountEmail}>{user?.email || ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </View>

        {/* Playback Section */}
        <TouchableOpacity style={styles.settingRow} onPress={handleClearCache}>
          <View style={[styles.settingIconCircle, { backgroundColor: 'rgba(138,43,226,0.2)' }]}>
            <Ionicons name="play-circle-outline" size={22} color="#8A2BE2" />
          </View>
          <View style={styles.settingRowInfo}>
            <Text style={styles.settingRowTitle}>Playback</Text>
            <Text style={styles.settingRowSub}>Gapless playback • Autoplay</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

        {/* Spotify-like settings buttons */}
        {settingsItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.settingRow} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Legal', { type: item.type })}
          >
            <View style={[styles.settingIconCircle, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={22} color={item.iconColor} />
            </View>
            <View style={styles.settingRowInfo}>
              <Text style={styles.settingRowTitle}>{item.title}</Text>
              <Text style={styles.settingRowSub}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>
        ))}

        {/* About Section */}
        <TouchableOpacity 
          style={styles.settingRow} 
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Legal', { type: 'about' })}
        >
          <View style={[styles.settingIconCircle, { backgroundColor: 'rgba(29,185,84,0.2)' }]}>
            <Ionicons name="information-circle-outline" size={22} color="#1DB954" />
          </View>
          <View style={styles.settingRowInfo}>
            <Text style={styles.settingRowTitle}>About and support</Text>
            <Text style={styles.settingRowSub}>Version • Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#444" />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Number of Plays Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.playCountHeader}
            onPress={() => setShowPlayCounts(!showPlayCounts)}
          >
            <View style={styles.playCountLeft}>
              <View style={[styles.settingIconCircle, { backgroundColor: 'rgba(187,134,252,0.2)' }]}>
                <Ionicons name="musical-notes" size={22} color="#BB86FC" />
              </View>
              <View>
                <Text style={styles.settingRowTitle}>Number of Plays</Text>
                <Text style={styles.settingRowSub}>
                  {sortedPlayCounts.length > 0 
                    ? `${sortedPlayCounts.length} tracks played` 
                    : 'No plays recorded yet'}
                </Text>
              </View>
            </View>
            <Ionicons 
              name={showPlayCounts ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>

          {showPlayCounts && (
            <View style={styles.playCountList}>
              {sortedPlayCounts.length > 0 ? (
                <>
                  {sortedPlayCounts.map((item, index) => (
                    <View key={item.id} style={styles.playCountItem}>
                      <Text style={styles.rankNumber}>{index + 1}</Text>
                      <Image
                        source={item.coverUrl ? { uri: item.coverUrl } : require('../../assets/icon.png')}
                        style={styles.playCountCover}
                      />
                      <View style={styles.playCountInfo}>
                        <Text style={styles.playCountTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.playCountArtist} numberOfLines={1}>{item.artist}</Text>
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>{item.count}</Text>
                        <Text style={styles.countLabel}>plays</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyPlays}>
                  <Ionicons name="disc-outline" size={48} color="#333" />
                  <Text style={styles.emptyPlaysText}>Start playing songs to see your stats here!</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Log Out */}
        <View style={styles.logoutSection}>
          <Text style={styles.versionText}>Photify v1.0.0</Text>
        </View>
      </ScrollView>

      <AestheticAlert 
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onClose={alertConfig.onClose}
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
  backBtn: {
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
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  // Account card
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  accountInfo: {
    marginLeft: 14,
    flex: 1,
  },
  accountName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  accountEmail: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  // Setting rows (Spotify-like)
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  settingIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingRowInfo: {
    flex: 1,
  },
  settingRowTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  settingRowSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 8,
    backgroundColor: '#0a0a0a',
    marginVertical: 16,
  },
  // Play counts
  playCountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
  },
  playCountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playCountList: {
    marginTop: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
  },
  playCountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  rankNumber: {
    color: '#8A2BE2',
    fontSize: 16,
    fontWeight: 'bold',
    width: 28,
    textAlign: 'center',
  },
  playCountCover: {
    width: 42,
    height: 42,
    borderRadius: 6,
    marginRight: 12,
  },
  playCountInfo: {
    flex: 1,
  },
  playCountTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playCountArtist: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(138,43,226,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    color: '#BB86FC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countLabel: {
    color: '#888',
    fontSize: 10,
  },
  resetBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  resetBtnText: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyPlays: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyPlaysText: {
    color: '#555',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  logoutSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  versionText: {
    color: '#444',
    fontSize: 12,
  },
});
