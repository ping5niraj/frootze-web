import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Button,
  Input, InputGroup, InputLeftAddon, InputRightElement,
  SimpleGrid, Flex
} from '@chakra-ui/react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

let recaptchaInitialized = false;
function resetRecaptcha() {
  try { if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; } } catch (e) {}
  recaptchaInitialized = false;
  const el = document.getElementById('recaptcha-container');
  if (el) el.innerHTML = '';
}
function initRecaptcha() {
  resetRecaptcha();
  try {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible', callback: () => {}, 'expired-callback': () => resetRecaptcha()
    });
    recaptchaInitialized = true;
  } catch (e) {}
}

const features = [
  { icon: '🌳', ta: 'குடும்ப மரம்',   en: 'Family Tree'   },
  { icon: '📸', ta: 'சமூக ஊடகம்',     en: 'Social Feed'   },
  { icon: '📍', ta: 'இட பகிர்வு',      en: 'Live Location' },
  { icon: '🎂', ta: 'பிறந்தநாள்',      en: 'Birthdays'     },
  { icon: '💬', ta: 'செய்திகள்',       en: 'Messages'      },
  { icon: '🧠', ta: 'வினாடி வினா',     en: 'Daily Quiz'    },
];

// ─── Reusable login card — used in both mobile and desktop ───
function LoginCard({ activeTab, setActiveTab, phone, setPhone, password, setPassword,
  showPassword, setShowPassword, loading, error, setError,
  handleSendOTP, handlePasswordLogin }) {
  return (
    <Box
      bg="white" borderRadius="3xl"
      boxShadow="0 24px 64px rgba(124,58,237,0.18), 0 4px 16px rgba(0,0,0,0.08)"
      border="1px solid" borderColor="purple.100"
      px={{ base: 6, md: 7 }} py={7}
      w="100%"
    >
      <VStack spacing={5} align="stretch">

        {/* Header */}
        <VStack spacing={1} align="flex-start">
          <Text fontSize="21px" fontWeight="800" color="purple.900">
            உள்நுழைக 👋
          </Text>
          <Text fontSize="13px" color="gray.400">
            Sign in to your family network
          </Text>
        </VStack>

        {/* Phone input — FIRST */}
        <InputGroup>
          <InputLeftAddon
            bg="purple.50" border="1.5px solid" borderColor="purple.200"
            borderRightColor="transparent"
            color="purple.700" fontSize="12px" fontWeight="700"
            h="48px" px={3} borderLeftRadius="xl">
            🇮🇳 +91
          </InputLeftAddon>
          <Input
            type="tel" maxLength={10}
            placeholder="தொலைபேசி எண் / Phone number"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && (activeTab === 'otp' ? handleSendOTP() : handlePasswordLogin())}
            bg="white" border="1.5px solid" borderColor="purple.200"
            borderLeftColor="transparent"
            color="purple.900" fontSize="17px" letterSpacing="2px" h="48px"
            borderRightRadius="xl"
            _placeholder={{ color: 'purple.200', letterSpacing: '0', fontSize: '13px' }}
            _focus={{ borderColor: 'purple.500', borderLeftColor: 'purple.500', zIndex: 1, boxShadow: '0 0 0 3px rgba(124,58,237,0.1)' }}
          />
        </InputGroup>

        {/* Login method toggle — SECOND */}
        <Box>
          <Text fontSize="11px" color="gray.400" mb={2} fontWeight="600">
            உள்நுழைவு முறை / Login method
          </Text>
          <HStack bg="purple.50" borderRadius="xl" p="5px"
            border="1px solid" borderColor="purple.100">
            {[
              { key: 'otp',      label: '📱 OTP'         },
              { key: 'password', label: '🔑 கடவுச்சொல்' },
            ].map(t => (
              <Button key={t.key} flex={1} size="sm" h="36px"
                bg={activeTab === t.key ? 'white' : 'transparent'}
                color={activeTab === t.key ? 'purple.700' : 'gray.400'}
                borderRadius="lg" fontWeight="700" fontSize="13px"
                boxShadow={activeTab === t.key ? '0 1px 6px rgba(124,58,237,0.15)' : 'none'}
                onClick={() => { setActiveTab(t.key); setError(''); }}
                _hover={{ bg: activeTab === t.key ? 'white' : 'purple.100' }}
                transition="all 0.15s">
                {t.label}
              </Button>
            ))}
          </HStack>
        </Box>

        {/* Password input — only shown when password tab selected */}
        {activeTab === 'password' && (
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="கடவுச்சொல் / Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
              bg="white" border="1.5px solid" borderColor="purple.200"
              color="purple.900" fontSize="15px" h="48px" borderRadius="xl"
              _placeholder={{ color: 'purple.200', fontSize: '13px' }}
              _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(124,58,237,0.1)' }}
            />
            <InputRightElement h="48px" pr={3}>
              <Text fontSize="lg" cursor="pointer" userSelect="none"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            </InputRightElement>
          </InputGroup>
        )}

        {/* Error */}
        {error && (
          <Box bg="red.50" border="1.5px solid" borderColor="red.200"
            borderRadius="xl" px={4} py={3}>
            <Text color="red.600" fontSize="12px" fontWeight="600">{error}</Text>
          </Box>
        )}

        <div id="recaptcha-container" />

        {/* Submit */}
        <Button
          w="100%" h="50px"
          bgGradient="linear(to-r, purple.600, green.500)"
          color="white" fontSize="15px" fontWeight="800"
          borderRadius="xl"
          isLoading={loading}
          loadingText={activeTab === 'otp' ? 'OTP அனுப்புகிறோம்...' : 'உள்நுழைகிறோம்...'}
          isDisabled={activeTab === 'otp' ? phone.length < 10 : phone.length < 10 || password.length < 6}
          onClick={activeTab === 'otp' ? handleSendOTP : handlePasswordLogin}
          boxShadow="0 4px 14px rgba(124,58,237,0.3)"
          _hover={{ transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(124,58,237,0.4)' }}
          _disabled={{ opacity: 0.5, cursor: 'not-allowed', transform: 'none', boxShadow: 'none' }}
          transition="all 0.2s">
          {activeTab === 'otp' ? '📱 OTP அனுப்பு →' : '🔑 உள்நுழை →'}
        </Button>

        {/* Trust badges */}
        <HStack justify="center" spacing={8} pt={1}>
          {[{ icon: '🔐', label: 'Secure' }, { icon: '⚡', label: 'Instant' }, { icon: '🆓', label: 'Free' }].map((t, i) => (
            <VStack key={i} spacing={0}>
              <Text fontSize="16px">{t.icon}</Text>
              <Text fontSize="10px" color="gray.400" fontWeight="600">{t.label}</Text>
            </VStack>
          ))}
        </HStack>

      </VStack>
    </Box>
  );
}

export default function Landing() {
  const [activeTab,    setActiveTab]    = useState('otp');
  const [phone,        setPhone]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
    setLoading(true);
    window.confirmationResult = null;
    try {
      initRecaptcha();
      await new Promise(r => setTimeout(r, 500));
      const res = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier);
      window.confirmationResult = res;
      localStorage.setItem('pmf_pending_phone', phone);
      navigate('/verify');
    } catch (err) {
      resetRecaptcha();
      if (err.code === 'auth/invalid-phone-number')   setError('தவறான எண் / Invalid number');
      else if (err.code === 'auth/too-many-requests')  setError('அதிக முயற்சி / Too many attempts. Try password login.');
      else setError('OTP அனுப்ப தோல்வி / Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handlePasswordLogin = async () => {
    setError('');
    if (!phone || phone.length < 10)      { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
    if (!password || password.length < 6) { setError('கடவுச்சொல் உள்ளிடவும்'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, { phone, password });
      login(res.data.token, res.data.user);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'உள்நுழைவு தோல்வி / Login failed');
    } finally { setLoading(false); }
  };

  const cardProps = {
    activeTab, setActiveTab, phone, setPhone,
    password, setPassword, showPassword, setShowPassword,
    loading, error, setError, handleSendOTP, handlePasswordLogin,
  };

  return (
    <Box minH="100vh" w="100vw" bg="#f5f3ff" overflowX="hidden">

      {/* ══════════════════════════════════════════════════════
          HERO — full width gradient
          Desktop: two columns (text left, login card right)
          Mobile:  stacked (text top, login card below)
      ══════════════════════════════════════════════════════ */}
      <Box
        bgGradient="linear(135deg, #4C1D95 0%, #6D28D9 50%, #059669 100%)"
        px={{ base: 5, md: 10, lg: 16 }}
        pt={{ base: 10, md: 12 }}
        pb={{ base: 10, md: 0 }}
        position="relative"
        overflow="hidden"
        minH={{ base: 'auto', md: '520px' }}
      >
        {/* Background decorative circles */}
        <Box position="absolute" top="-80px" right="-80px"
          w="320px" h="320px" borderRadius="full"
          bg="rgba(255,255,255,0.04)" pointerEvents="none" />
        <Box position="absolute" bottom="-60px" left="30%"
          w="240px" h="240px" borderRadius="full"
          bg="rgba(255,255,255,0.04)" pointerEvents="none" />

        {/* Top nav bar */}
        <HStack justify="space-between" mb={{ base: 10, md: 14 }} position="relative" zIndex={1}>
          <HStack spacing={3}>
            <Box
              w={{ base: '42px', md: '48px' }} h={{ base: '42px', md: '48px' }}
              borderRadius="xl"
              bg="rgba(255,255,255,0.15)"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.25)"
              display="flex" alignItems="center" justifyContent="center"
              fontSize={{ base: '20px', md: '24px' }}>
              🌳
            </Box>
            <Text fontSize={{ base: '26px', md: '32px' }}
              fontWeight="900" color="white" letterSpacing="-1px">
              frootze
            </Text>
          </HStack>
          <Box px={4} py={2} borderRadius="full"
            bg="rgba(255,255,255,0.12)"
            border="1px solid rgba(255,255,255,0.2)"
            backdropFilter="blur(10px)">
            <Text fontSize={{ base: '11px', md: '12px' }}
              fontWeight="700" color="white" letterSpacing="wider">
              Tamil Family Network
            </Text>
          </Box>
        </HStack>

        {/* Two-column content */}
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align={{ base: 'stretch', md: 'flex-start' }}
          justify="space-between"
          gap={{ base: 8, md: 10 }}
          position="relative" zIndex={1}
          maxW="1200px" mx="auto"
        >
          {/* LEFT — Hero text (desktop: takes 55%, mobile: full) */}
          <VStack
            align="flex-start" spacing={5}
            flex={{ base: 'none', md: '1' }}
            pt={{ base: 0, md: 4 }}
            pb={{ base: 4, md: 16 }}
          >
            {/* Headline */}
            <Box>
              <Text
                fontSize={{ base: '36px', sm: '44px', md: '52px', lg: '58px' }}
                fontWeight="900" color="white"
                lineHeight="1.05" letterSpacing="-1.5px">
                உங்கள் குடும்பத்தை
              </Text>
              <Text
                fontSize={{ base: '36px', sm: '44px', md: '52px', lg: '58px' }}
                fontWeight="900" color="#A3E635"
                lineHeight="1.05" letterSpacing="-1.5px">
                இணைக்குங்கள்
              </Text>
            </Box>

            {/* Subtext */}
            <VStack align="flex-start" spacing={1}>
              <Text fontSize={{ base: '15px', md: '17px' }}
                color="rgba(255,255,255,0.8)" lineHeight="1.6" maxW="420px">
                குடும்ப மரம், சமூக ஊடகம், செய்திகள் —
                அனைத்தும் ஒரே இடத்தில்.
              </Text>
              <Text fontSize={{ base: '13px', md: '14px' }}
                color="rgba(255,255,255,0.45)" maxW="380px">
                Family tree, social feed, messages — all in one place.
              </Text>
            </VStack>

            {/* Feature pills */}
            <HStack spacing={2} flexWrap="wrap" pt={2}>
              {['🌳 மரம்', '📸 பதிவுகள்', '💬 செய்தி', '🎂 பிறந்தநாள்', '📍 இடம்'].map((f, i) => (
                <Box key={i} px={3} py="6px" borderRadius="full"
                  bg="rgba(255,255,255,0.12)"
                  border="1px solid rgba(255,255,255,0.22)"
                  backdropFilter="blur(4px)">
                  <Text fontSize="12px" color="white" fontWeight="600">{f}</Text>
                </Box>
              ))}
            </HStack>

            {/* Stats row */}
            <HStack spacing={6} pt={2}>
              {[
                { value: '100%', label: 'Free Forever' },
                { value: '🔐',   label: 'Firebase Auth' },
                { value: '🌳',   label: 'Tamil Family'  },
              ].map((s, i) => (
                <VStack key={i} spacing={0} align="flex-start">
                  <Text fontSize={{ base: '16px', md: '18px' }}
                    fontWeight="900" color="white">{s.value}</Text>
                  <Text fontSize="10px" color="rgba(255,255,255,0.5)"
                    fontWeight="600">{s.label}</Text>
                </VStack>
              ))}
            </HStack>
          </VStack>

          {/* RIGHT — Login card (desktop: fixed width, mobile: hidden here, shown below) */}
          <Box
            display={{ base: 'none', md: 'block' }}
            w={{ md: '360px', lg: '400px' }}
            flexShrink={0}
            mt={-2}
            mb={-8}
          >
            <LoginCard {...cardProps} />
          </Box>
        </Flex>
      </Box>

      {/* ── MOBILE: Login card below hero ───────────────────── */}
      <Box
        display={{ base: 'block', md: 'none' }}
        px={4} mt={-6} position="relative" zIndex={10}
      >
        <LoginCard {...cardProps} />
      </Box>

      {/* ══════════════════════════════════════════════════════
          FEATURES GRID — below hero on all screens
      ══════════════════════════════════════════════════════ */}
      <Box
        px={{ base: 4, md: 10, lg: 16 }}
        py={{ base: 10, md: 12 }}
        maxW="1200px" mx="auto"
      >
        {/* Section label */}
        <HStack justify="center" mb={6} spacing={3}>
          <Box h="1px" flex={1} bg="purple.200" />
          <Text fontSize="11px" fontWeight="800" color="purple.400"
            letterSpacing="widest" textTransform="uppercase" whiteSpace="nowrap">
            What's inside frootze
          </Text>
          <Box h="1px" flex={1} bg="purple.200" />
        </HStack>

        <SimpleGrid columns={{ base: 2, sm: 3, md: 6 }} spacing={4}>
          {features.map((f, i) => (
            <Box key={i}
              bg="white" border="1.5px solid" borderColor="purple.100"
              borderRadius="2xl" py={5} px={3} textAlign="center"
              boxShadow="0 1px 6px rgba(124,58,237,0.06)"
              _hover={{
                borderColor: 'purple.300',
                transform: 'translateY(-3px)',
                boxShadow: '0 8px 24px rgba(124,58,237,0.12)',
              }}
              transition="all 0.2s">
              <Text fontSize="32px" mb={2}>{f.icon}</Text>
              <Text fontSize="12px" fontWeight="800" color="purple.800">{f.ta}</Text>
              <Text fontSize="10px" color="gray.400" mt={1}>{f.en}</Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* Footer */}
        <Text textAlign="center" fontSize="11px" color="gray.400" mt={10}>
          © 2026 frootze · Tamil Family Network · support@nalamini.com
        </Text>
      </Box>

    </Box>
  );
}
