import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { mobileApi } from './src/services/api';
import { CardCredential, User, DynamicQrToken } from './src/types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'wallet' | 'attendance' | 'garud' | 'profile'>('wallet');
  const [cards, setCards] = useState<CardCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionRevoked, setSessionRevoked] = useState(false);

  // Role Login State for Mobile
  const [loginRole, setLoginRole] = useState<'CARDHOLDER' | 'GARUD' | 'ADMIN'>('CARDHOLDER');
  const [loginEmail, setLoginEmail] = useState('aarav@cardzo.io');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [serverHost, setServerHost] = useState(mobileApi.getBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);

  // Dynamic QR Overlay
  const [selectedCard, setSelectedCard] = useState<CardCredential | null>(null);
  const [dynamicQr, setDynamicQr] = useState<DynamicQrToken | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(45);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // Garud Scanner Mode
  const [garudTokenInput, setGarudTokenInput] = useState('');
  const [garudVerdict, setGarudVerdict] = useState<any>(null);
  const [verifyingGarud, setVerifyingGarud] = useState(false);

  // Physical Card Scan Modal
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('Campus Library & Archive Pass');
  const [newCardCategory, setNewCardCategory] = useState('Membership');

  // Attendance
  const [attendanceState, setAttendanceState] = useState<{ isCheckedIn: boolean }>({ isCheckedIn: false });
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  const handleRoleSelect = (role: 'CARDHOLDER' | 'GARUD' | 'ADMIN') => {
    setLoginRole(role);
    if (role === 'CARDHOLDER') {
      setLoginEmail('aarav@cardzo.io');
    } else if (role === 'GARUD') {
      setLoginEmail('garud@cardzo.io');
    } else {
      setLoginEmail('admin@cardzo.io');
    }
    setLoginPassword('Password123!');
  };

  const handleLogin = async (emailToLogin?: string, passToLogin?: string) => {
    const targetEmail = emailToLogin || loginEmail;
    const targetPass = passToLogin || loginPassword;
    setLoading(true);
    setSessionRevoked(false);

    try {
      mobileApi.setBaseUrl(serverHost);
      const isAndroid = Platform.OS === 'android';
      const devicePlatform = isAndroid ? 'android' : 'ios';
      const deviceModel = isAndroid ? 'Android Smartphone' : 'Apple iPhone';

      const data = await mobileApi.login(
        targetEmail,
        targetPass,
        `${devicePlatform}-${targetEmail.split('@')[0]}-${Date.now().toString().slice(-4)}`,
        deviceModel,
        devicePlatform
      );

      setCurrentUser(data.user);
      setAttendanceState(data.attendanceState || { isCheckedIn: false });

      // Role adaptive default tab
      if (data.user.role === 'GARUD') {
        setActiveTab('garud');
      } else {
        setActiveTab('wallet');
      }

      await loadUserData();
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Could not connect to Cardzo backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await mobileApi.logout();
    setCurrentUser(null);
    setDynamicQr(null);
    setCards([]);
    setAttendanceHistory([]);
  };

  const loadUserData = async () => {
    try {
      const userCards = await mobileApi.getCards();
      setCards(userCards);

      const att = await mobileApi.getCurrentAttendance().catch(() => ({ isCheckedIn: false }));
      setAttendanceState(att);

      const hist = await mobileApi.getAttendanceHistory().catch(() => ({ sessions: [] }));
      setAttendanceHistory(hist.sessions || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    mobileApi.onSessionRevoked(() => {
      setSessionRevoked(true);
    });
  }, []);

  // Countdown timer for active dynamic QR
  useEffect(() => {
    if (!qrModalVisible || !dynamicQr) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(dynamicQr.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        refreshDynamicQr();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [qrModalVisible, dynamicQr]);

  const openCardDynamicQr = async (card: CardCredential) => {
    setSelectedCard(card);
    setQrModalVisible(true);
    await refreshDynamicQr(card.id);
  };

  const refreshDynamicQr = async (cardId?: string) => {
    try {
      const tokenData = await mobileApi.generateDynamicQr(cardId || selectedCard?.id);
      setDynamicQr(tokenData);
      setSecondsRemaining(tokenData.validitySeconds || 45);
      const att = await mobileApi.getCurrentAttendance();
      setAttendanceState(att);
    } catch (err: any) {
      console.error('Failed to generate token:', err);
    }
  };

  const handleSaveCard = async () => {
    try {
      await mobileApi.scanCard({
        title: newCardTitle,
        type: 'COLLEGE_ID',
        issuerName: 'Apex Campus Services',
        cardholderName: currentUser?.name || 'Cardholder',
        category: newCardCategory,
        colorTheme: 'purple',
        isScannedPhysical: true
      });
      setScanModalVisible(false);
      await loadUserData();
      Alert.alert('Card Added', 'Physical card visual copy saved securely to your wallet.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleGarudVerify = async () => {
    if (!garudTokenInput) return;
    setVerifyingGarud(true);
    setGarudVerdict(null);
    try {
      const res = await mobileApi.verifyGarudToken(garudTokenInput, 'Main Gate Alpha Turnstile');
      setGarudVerdict(res);
      await loadUserData();
    } catch (err: any) {
      setGarudVerdict({ success: false, message: err.message });
    } finally {
      setVerifyingGarud(false);
    }
  };

  // 1. ROLE-BASED LOGIN SCREEN FOR MOBILE / ANDROID
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.loginScroll}>
          {/* Brand Header */}
          <View style={styles.loginHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>CRDZ</Text>
            </View>
            <Text style={styles.loginTitle}>Cardzo</Text>
            <Text style={styles.loginTagline}>One Pass. Every Identity.</Text>
            <Text style={styles.loginSub}>Select your role to access your mobile identity pass:</Text>
          </View>

          {/* Role Selection Tabs */}
          <View style={styles.roleTabsRow}>
            <TouchableOpacity
              onPress={() => handleRoleSelect('CARDHOLDER')}
              style={[styles.roleTab, loginRole === 'CARDHOLDER' && styles.roleTabActiveStudent]}
            >
              <Text style={styles.roleTabIcon}>🎓</Text>
              <Text style={[styles.roleTabText, loginRole === 'CARDHOLDER' && styles.roleTabTextActive]}>Student</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleRoleSelect('GARUD')}
              style={[styles.roleTab, loginRole === 'GARUD' && styles.roleTabActiveGarud]}
            >
              <Text style={styles.roleTabIcon}>🛡️</Text>
              <Text style={[styles.roleTabText, loginRole === 'GARUD' && styles.roleTabTextActive]}>Garud Gate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleRoleSelect('ADMIN')}
              style={[styles.roleTab, loginRole === 'ADMIN' && styles.roleTabActiveAdmin]}
            >
              <Text style={styles.roleTabIcon}>👑</Text>
              <Text style={[styles.roleTabText, loginRole === 'ADMIN' && styles.roleTabTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>

          {/* Role Info Box */}
          <View style={styles.roleInfoBox}>
            <Text style={styles.roleInfoTitle}>
              {loginRole === 'CARDHOLDER' ? 'Student Digital Wallet' : loginRole === 'GARUD' ? 'Garud Gate Verifier Terminal' : 'Institutional Admin'}
            </Text>
            <Text style={styles.roleInfoDesc}>
              {loginRole === 'CARDHOLDER'
                ? 'Dynamic 45s QR pass, scanned credentials, and attendance check-in status.'
                : loginRole === 'GARUD'
                ? 'High-speed gate turnstile verification and live check-in/out state machine.'
                : 'Mobile registrar overview and system-wide security monitoring.'}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              value={loginEmail}
              onChangeText={setLoginEmail}
              placeholder="name@cardzo.io"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.inputField}
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              value={loginPassword}
              onChangeText={setLoginPassword}
              placeholder="••••••••••••"
              placeholderTextColor="#64748B"
              secureTextEntry
              style={styles.inputField}
            />

            {/* Login Action Button */}
            <TouchableOpacity
              onPress={() => handleLogin()}
              disabled={loading}
              style={[
                styles.primaryLoginBtn,
                loginRole === 'GARUD' ? styles.btnGarud : loginRole === 'CARDHOLDER' ? styles.btnStudent : styles.btnAdmin
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryLoginBtnText}>
                  Sign In as {loginRole === 'CARDHOLDER' ? 'Student' : loginRole === 'GARUD' ? 'Garud Verifier' : 'Admin'}
                </Text>
              )}
            </TouchableOpacity>

            {/* 1-Tap Demo Quick Login */}
            <TouchableOpacity
              onPress={() => {
                const demoEmail = loginRole === 'CARDHOLDER' ? 'aarav@cardzo.io' : loginRole === 'GARUD' ? 'garud@cardzo.io' : 'admin@cardzo.io';
                handleLogin(demoEmail, 'Password123!');
              }}
              style={styles.quickDemoBtn}
            >
              <Text style={styles.quickDemoBtnText}>⚡ 1-Tap Demo Sign In ({loginRole === 'CARDHOLDER' ? 'Aarav Sharma' : loginRole === 'GARUD' ? 'Officer Vikram' : 'Dr. Elena'})</Text>
            </TouchableOpacity>

            {/* Android / Network Server Host Toggle */}
            <TouchableOpacity onPress={() => setShowServerConfig(!showServerConfig)} style={styles.hostConfigToggle}>
              <Text style={styles.hostConfigToggleText}>
                ⚙️ Server Host ({Platform.OS === 'android' ? 'Android: 10.0.2.2' : 'Localhost'})
              </Text>
            </TouchableOpacity>

            {showServerConfig && (
              <View style={styles.hostConfigBox}>
                <Text style={styles.hostConfigLabel}>Backend API Endpoint:</Text>
                <TextInput
                  value={serverHost}
                  onChangeText={setServerHost}
                  placeholder="http://10.0.2.2:4000/api"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  style={styles.hostConfigInput}
                />
                <Text style={styles.hostConfigHelp}>
                  • Android Emulator: http://10.0.2.2:4000/api{'\n'}
                  • Physical Android phone: http://[YOUR-PC-IP]:4000/api
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. AUTHENTICATED APP VIEWS
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Single Device Session Invalidation Warning */}
      {sessionRevoked && (
        <View style={styles.revokedBanner}>
          <Text style={styles.revokedBannerText}>
            ⚠️ Session Revoked: Account signed in on another device.
          </Text>
          <TouchableOpacity onPress={() => handleLogin(currentUser?.email || 'aarav@cardzo.io')} style={styles.reauthBtn}>
            <Text style={styles.reauthBtnText}>Re-authenticate</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.brandTitle}>Cardzo</Text>
            <View style={[styles.roleBadgeHeader, currentUser.role === 'GARUD' ? styles.garudBadgeBg : styles.studentBadgeBg]}>
              <Text style={styles.roleBadgeHeaderText}>{currentUser.role}</Text>
            </View>
          </View>
          <Text style={styles.brandSubtitle}>
            {currentUser.name} • {currentUser.identifierNumber || 'Cardzo User'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.statusBadge, attendanceState.isCheckedIn ? styles.checkedInBadge : styles.checkedOutBadge]}>
            <Text style={[styles.statusBadgeText, attendanceState.isCheckedIn ? styles.checkedInText : styles.checkedOutText]}>
              {attendanceState.isCheckedIn ? '● Checked In' : '○ Checked Out'}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Tab Screen */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'wallet' && (
          <View>
            {/* Gamified Streak Banner */}
            <View style={styles.streakCard}>
              <View>
                <Text style={styles.streakTitle}>🔥 5-Day Campus Streak</Text>
                <Text style={styles.streakSub}>98.5% on-time attendance recorded</Text>
              </View>
              <TouchableOpacity onPress={() => setScanModalVisible(true)} style={styles.scanCardBtn}>
                <Text style={styles.scanCardBtnText}>+ Scan a Card</Text>
              </TouchableOpacity>
            </View>

            {/* Apple Wallet Style Stacked Card Deck */}
            <Text style={styles.sectionHeader}>YOUR PASSES ({cards.length})</Text>

            <View style={styles.cardDeckContainer}>
              {cards.map((card, idx) => (
                <TouchableOpacity
                  key={card.id}
                  activeOpacity={0.9}
                  onPress={() => openCardDynamicQr(card)}
                  style={[
                    styles.walletCard,
                    card.colorTheme === 'emerald' ? styles.cardEmerald : card.colorTheme === 'purple' ? styles.cardPurple : styles.cardBlue,
                    { top: idx * 75 }
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardIssuer}>{card.issuerName}</Text>
                    <View style={card.isVerified ? styles.verifiedBadge : styles.scannedBadge}>
                      <Text style={styles.badgeText}>{card.isVerified ? 'VERIFIED PASS' : 'SCANNED COPY'}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{card.title}</Text>

                  <View style={styles.cardBottomRow}>
                    <View>
                      <Text style={styles.cardholderName}>{card.cardholderName}</Text>
                      <Text style={styles.cardId}>{card.identifier || 'CRDZ-PASS'}</Text>
                    </View>
                    <View style={styles.tapActionPill}>
                      <Text style={styles.tapActionText}>Tap to Open QR ➔</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'attendance' && (
          <View>
            <Text style={styles.sectionHeader}>CAMPUS ATTENDANCE HISTORY</Text>
            {attendanceHistory.map((sess) => (
              <View key={sess.id} style={styles.historyCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.historyDate}>{new Date(sess.checkInTimestamp).toLocaleDateString()}</Text>
                  <Text style={sess.status === 'CHECKED_IN' ? styles.checkedInText : styles.historyLocation}>
                    {sess.status === 'CHECKED_IN' ? 'Active Session' : 'Completed'}
                  </Text>
                </View>
                <Text style={styles.historySub}>
                  In: {new Date(sess.checkInTimestamp).toLocaleTimeString()}
                  {sess.checkOutTimestamp ? ` • Out: ${new Date(sess.checkOutTimestamp).toLocaleTimeString()}` : ''}
                </Text>
                <Text style={styles.historySub}>Location: {sess.location || 'Main Gate Alpha'}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'garud' && (
          <View>
            <Text style={styles.sectionHeader}>GARUD GATE VERIFIER TERMINAL</Text>
            <View style={styles.garudBox}>
              <Text style={styles.garudTitle}>Scan Student Dynamic QR</Text>
              <TextInput
                value={garudTokenInput}
                onChangeText={setGarudTokenInput}
                placeholder="Paste or scan CRDZ- token..."
                placeholderTextColor="#64748B"
                style={styles.input}
              />
              <TouchableOpacity onPress={handleGarudVerify} disabled={verifyingGarud} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>{verifyingGarud ? 'Verifying...' : 'Verify Pass'}</Text>
              </TouchableOpacity>

              {garudVerdict && (
                <View style={[styles.verdictBox, garudVerdict.success ? styles.verdictSuccess : styles.verdictError]}>
                  <Text style={styles.verdictTitle}>
                    {garudVerdict.success ? (garudVerdict.action === 'CHECK_IN' ? 'CHECK-IN SUCCESSFUL' : 'CHECK-OUT SUCCESSFUL') : 'VERIFICATION REJECTED'}
                  </Text>
                  <Text style={styles.verdictSub}>{garudVerdict.message}</Text>
                  {garudVerdict.cardholder && (
                    <Text style={styles.verdictSub}>Cardholder: {garudVerdict.cardholder.name} ({garudVerdict.cardholder.identifierNumber})</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'profile' && (
          <View>
            <Text style={styles.sectionHeader}>SECURITY & ACCOUNT</Text>
            <View style={styles.historyCard}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 }}>{currentUser?.name}</Text>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginBottom: 8 }}>{currentUser?.email}</Text>
              <Text style={{ fontSize: 13, color: '#60A5FA' }}>Role: {currentUser?.role}</Text>
              <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Department: {currentUser?.department || 'General'}</Text>
            </View>

            <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { marginTop: 24 }]}>
              <Text style={styles.logoutBtnText}>🚪 Log Out of Device</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Dynamic QR Overlay Modal */}
      <Modal visible={qrModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragBar} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>{selectedCard?.title}</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{currentUser?.name} • {currentUser?.identifierNumber}</Text>

            {/* Dynamic QR Box */}
            <View style={styles.qrCard}>
              <View style={styles.qrMockCode}>
                <Text style={styles.qrCodeIcon}>[ DYNAMIC QR ]</Text>
                <Text style={styles.qrCodeToken}>{dynamicQr?.token}</Text>
              </View>
              <Text style={styles.qrCountdown}>⏱️ Valid for {secondsRemaining} seconds</Text>
              <Text style={styles.qrHelp}>Presents single-use cryptographic token to verifier.</Text>
            </View>

            <TouchableOpacity onPress={() => refreshDynamicQr()} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>🔄 Refresh Dynamic Pass</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scan a Card Modal */}
      <Modal visible={scanModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragBar} />
            <Text style={styles.modalTitle}>Scan Physical Card</Text>
            <Text style={styles.modalSubtitle}>Preserves original colors, layout, and aspect ratio.</Text>

            <View style={styles.cameraBox}>
              <Text style={styles.cameraBoxText}>[ CAMERA ALIGNMENT FRAME ]</Text>
              <Text style={styles.cameraSubText}>Align card boundaries in frame</Text>
            </View>

            <TextInput
              value={newCardTitle}
              onChangeText={setNewCardTitle}
              placeholder="Card Title"
              placeholderTextColor="#64748B"
              style={styles.input}
            />

            <TouchableOpacity onPress={handleSaveCard} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Save Scanned Card</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setScanModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => setActiveTab('wallet')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'wallet' && styles.navTextActive]}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('attendance')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'attendance' && styles.navTextActive]}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('garud')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'garud' && styles.navTextActive]}>Garud Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('profile')} style={styles.navItem}>
          <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  loginScroll: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  loginTagline: {
    fontSize: 13,
    color: '#0A84FF',
    fontWeight: '600',
    marginTop: 2,
  },
  loginSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  roleTabsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleTabActiveStudent: {
    borderColor: '#BF5AF2',
    backgroundColor: 'rgba(191,90,242,0.12)',
  },
  roleTabActiveGarud: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48,209,88,0.12)',
  },
  roleTabActiveAdmin: {
    borderColor: '#0A84FF',
    backgroundColor: 'rgba(10,132,255,0.12)',
  },
  roleTabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  roleInfoBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  roleInfoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleInfoDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
  },
  formContainer: {
    width: '100%',
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: '#FFFFFF',
    padding: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  primaryLoginBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    elevation: 4,
  },
  btnStudent: {
    backgroundColor: '#BF5AF2',
  },
  btnGarud: {
    backgroundColor: '#10B981',
  },
  btnAdmin: {
    backgroundColor: '#0A84FF',
  },
  primaryLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickDemoBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  quickDemoBtnText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
  hostConfigToggle: {
    alignItems: 'center',
    marginTop: 20,
  },
  hostConfigToggleText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  hostConfigBox: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  hostConfigLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  hostConfigInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#38BDF8',
    padding: 8,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  hostConfigHelp: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadgeHeader: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  studentBadgeBg: {
    backgroundColor: 'rgba(191,90,242,0.2)',
  },
  garudBadgeBg: {
    backgroundColor: 'rgba(48,209,88,0.2)',
  },
  roleBadgeHeaderText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  checkedInBadge: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.4)',
  },
  checkedOutBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checkedInText: {
    color: '#30D158',
  },
  checkedOutText: {
    color: '#94A3B8',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  streakCard: {
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 10, 0.3)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  streakTitle: {
    color: '#FF9F0A',
    fontWeight: '700',
    fontSize: 15,
  },
  streakSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  scanCardBtn: {
    backgroundColor: '#FF9F0A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanCardBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 14,
  },
  cardDeckContainer: {
    height: 440,
    position: 'relative',
  },
  walletCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 200,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  cardBlue: {
    backgroundColor: '#0A84FF',
  },
  cardPurple: {
    backgroundColor: '#5E5CE6',
  },
  cardEmerald: {
    backgroundColor: '#059669',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIssuer: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    opacity: 0.9,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scannedBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardholderName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cardId: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  tapActionPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tapActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  historyDate: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  historyLocation: {
    color: '#94A3B8',
    fontSize: 12,
  },
  historySub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  garudBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
  },
  garudTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: '#0A84FF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    padding: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  verdictBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  verdictSuccess: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderColor: 'rgba(48, 209, 88, 0.4)',
  },
  verdictError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  verdictTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  verdictSub: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalDragBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  closeBtn: {
    color: '#FFFFFF',
    fontSize: 18,
    padding: 4,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrMockCode: {
    backgroundColor: '#F1F5F9',
    width: 200,
    height: 180,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qrCodeIcon: {
    color: '#0A84FF',
    fontWeight: '800',
    fontSize: 16,
  },
  qrCodeToken: {
    color: '#475569',
    fontFamily: 'monospace',
    fontSize: 9,
    marginTop: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  qrCountdown: {
    color: '#0A84FF',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 12,
  },
  qrHelp: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  refreshBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  cameraBox: {
    height: 180,
    borderWidth: 2,
    borderColor: '#0A84FF',
    borderRadius: 14,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
    marginBottom: 16,
  },
  cameraBoxText: {
    color: '#0A84FF',
    fontWeight: '700',
    fontSize: 13,
  },
  cameraSubText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  navText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#0A84FF',
    fontWeight: '700',
  },
  revokedBanner: {
    backgroundColor: '#DC2626',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revokedBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  reauthBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reauthBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
});
