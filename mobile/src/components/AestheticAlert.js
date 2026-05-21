import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AestheticAlert({ 
  visible, 
  title, 
  message, 
  onClose, 
  onConfirm, 
  confirmText = "OK", 
  cancelText = "Cancel",
  type = "info" // 'info', 'error', 'success', 'warning'
}) {
  
  const getIcon = () => {
    switch(type) {
      case 'error': return 'close-circle';
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      default: return 'information-circle';
    }
  };

  const getColor = () => {
    switch(type) {
      case 'error': return '#ff4444';
      case 'success': return '#1DB954';
      case 'warning': return '#FFA726';
      default: return '#BB86FC';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${getColor()}20` }]}>
            <Ionicons name={getIcon()} size={32} color={getColor()} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {onConfirm && (
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: getColor() }]} 
              onPress={onConfirm ? onConfirm : onClose}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
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
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#b3b3b3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#2a2a2a',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
