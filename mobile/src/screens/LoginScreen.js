import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AestheticAlert from '../components/AestheticAlert';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const { login } = useContext(AuthContext);

  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ title, message, type, confirmText: 'OK', onClose: () => setAlertVisible(false) });
    setAlertVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please enter both email and password', 'error');
      return;
    }
    
    const result = await login(email, password);
    if (!result.success) {
      showAlert('Login Failed', result.message, 'error');
    }
  };

  return (
    <LinearGradient
      colors={['#1a0b2e', '#000000']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
            />
            <Text style={styles.title}>PHOTIFY</Text>
          </View>


        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email ID"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Password"
              placeholderTextColor="#777"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#b3b3b3" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>

      <AestheticAlert 
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        onClose={alertConfig.onClose}
      />
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 25,
  },
  title: {
    color: '#8A2BE2',
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: 4,
    textShadowColor: 'rgba(138, 43, 226, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  inputContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#1A1A1A',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  loginBtn: {
    backgroundColor: '#8A2BE2',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 25,
  },
  forgotText: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    paddingRight: 15,
  },
  eyeIcon: {
    padding: 5,
  }

});

