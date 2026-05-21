import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LegalScreen({ route, navigation }) {
  const { type } = route.params || { type: 'about' };

  const getContent = () => {
    switch (type) {
      case 'about':
        return {
          title: 'About Photify',
          icon: 'information-circle',
          iconColor: '#1DB954',
          sections: [
            {
              title: 'Version',
              content: '1.00',
            },
            {
              title: 'Platform',
              content: 'Built with React Native & Expo',
            },
            {
              title: 'Developer',
              content: 'Photify Team',
            },
            {
              title: 'Description',
              content: 'Photify is a premium music streaming experience that brings your Google Drive library to life. Enjoy seamless playback, smart organization, and a beautiful interface designed for music lovers.',
            }
          ]
        };
      case 'privacy':
        return {
          title: 'Privacy Policy',
          icon: 'shield-checkmark',
          iconColor: '#42A5F5',
          sections: [
            {
              title: 'Data Collection',
              content: 'We only access your Google Drive music files to provide the streaming service. We do not store your personal files on our servers.',
            },
            {
              title: 'Account Information',
              content: 'Your name and email are used solely for personalization and sync purposes across your devices.',
            },
            {
              title: 'Third Party Services',
              content: 'Photify uses Google OAuth for secure authentication. Your credentials never touch our servers directly.',
            },
            {
              title: 'Updates',
              content: 'Our privacy policy may be updated from time to time. You will be notified of any significant changes.',
            }
          ]
        };
      case 'social':
        return {
          title: 'Privacy and Social',
          icon: 'people',
          iconColor: '#1DB954',
          sections: [
            {
              title: 'Private Session',
              content: 'Enabled. Your listening activity is currently private and not shared with others.',
            },
            {
              title: 'Public Playlists',
              content: 'Your playlists are private by default. You can change visibility settings in each playlist\'s detail view.',
            },
            {
              title: 'Social Sharing',
              content: 'Connect your accounts to share what you\'re listening to with your friends on Instagram, Twitter, and more.',
            }
          ]
        };
      case 'notifications':
        return {
          title: 'Notifications',
          icon: 'notifications',
          iconColor: '#FFA726',
          sections: [
            {
              title: 'Push Notifications',
              content: 'Stay updated with new releases, playlist updates, and system alerts.',
            },
            {
              title: 'Email Notifications',
              content: 'Weekly recaps and personalized recommendations sent to your inbox.',
            }
          ]
        };
      default:
        return {
          title: 'Information',
          icon: 'help-circle',
          iconColor: '#8A2BE2',
          sections: [
            {
              title: 'Support',
              content: 'For support inquiries, please contact us at support@photify.com',
            }
          ]
        };
    }
  };

  const content = getContent();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{content.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${content.iconColor}20` }]}>
            <Ionicons name={content.icon} size={60} color={content.iconColor} />
          </View>
        </View>

        {content.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {type === 'about' && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
            >
              <Text style={styles.actionButtonText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2026 Photify Inc.</Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionContent: {
    color: '#b3b3b3',
    fontSize: 15,
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  copyright: {
    color: '#444',
    fontSize: 12,
  },
});
