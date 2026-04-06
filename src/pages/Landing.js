import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Button,
  Input, InputGroup, InputLeftAddon, InputRightElement,
  SimpleGrid
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
  { icon: '🌳', ta: 'குடும்ப மரம்',       en: 'Family Tree'      },
  { icon: '📸', ta: 'சமூக ஊடகம்',         en: 'Social Feed'      },
  { icon: '📍', ta: 'இட பகிர்வு',          en: 'Live Location'    },
  { icon: '🎂', ta: 'பிறந்தநாள்',          en: 'Birthdays'        },
  { icon: '💬', ta: 'செய்திகள்',           en: 'Messages'         },
  { icon: '🧠', ta: 'வினாடி வினா',         en: 'Daily Quiz'       },
];

export default function Landing() {
  const [activeTab,    setActiveTab]    = useState('otp');
  const [phone,        setPhone]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const { login } = useAuth();
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
    if (!phone || phone.length < 10)   { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
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

  return (
    <Box minH="100vh" w="100vw" bg="#f5f3ff" overflowX="hidden">

      {/* ── HERO SECTION ────────────────────────────────────── */}
      <Box
        bgGradient="linear(135deg, #4C1D95 0%, #6D28D9 40%, #059669 100%)"
        px={{ base: 6, md: 16 }}
        pt={{ base: 12, md: 16 }}
        pb={{ base: 16, md: 20 }}
        position="relative"
        overflow="hidden"
      >
        {/* Decorative circles */}
        <Box position="absolute" top="-60px" right="-60px"
          w="280px" h="280px" borderRadius="full"
          bg="rgba(255,255,255,0.05)" pointerEvents="none" />
        <Box position="absolute" bottom="-40px" left="-40px"
          w="200px" h="200px" borderRadius="full"
          bg="rgba(255,255,255,0.05)" pointerEvents="none" />

        {/* Logo bar */}
        <HStack justify="space-between" mb={{ base: 12, md: 16 }} position="relative">
          <HStack spacing={3}>
            <Box
              w={{ base: '44px', md: '52px' }} h={{ base: '44px', md: '52px' }}
              borderRadius="xl"
              bg="rgba(255,255,255,0.15)"
              backdropFilter="blur(10px)"
              border="1px solid rgba(255,255,255,0.25)"
              display="flex" alignItems="center" justifyContent="center"
              fontSize={{ base: '22px', md: '26px' }}
            >
              🌳
            </Box>
            <Text
              fontSize={{ base: '28px', md: '36px' }}
              fontWeight="900" color="white"
              letterSpacing="-1px"
            >
              frootze
            </Text>
          </HStack>
          <Box
            px={4} py={2} borderRadius="full"
            bg="rgba(255,255,255,0.15)"
            border="1px solid rgba(255,255,255,0.25)"
            backdropFilter="blur(10px)"
          >
            <Text fontSize={{ base: '11px', md: 'sm' }} fontWeight="700"
              color="white" letterSpacing="wider">
              Tamil Family Network
            </Text>
          </Box>
        </HStack>

        {/* Hero text */}
        <VStack align="flex-start" spacing={4} position="relative" maxW="600px">
          <Text
            fontSize={{ base: '32px', sm: '40px', md: '52px' }}
            fontWeight="900" color="white"
            lineHeight="1.1" letterSpacing="-1px"
          >
            உங்கள் குடும்பத்தை
            <br />
            <Box as="span" color="#A3E635">
              இணைக்குங்கள்
            </Box>
          </Text>
          <Text
            fontSize={{ base: '15px', md: '18px' }}
            color="rgba(255,255,255,0.75)"
            lineHeight="1.6"
            maxW="480px"
          >
            குடும்ப மரம், சமூக ஊடகம், செய்திகள் — அனைத்தும் ஒரே இடத்தில்.
            <br />
            <Box as="span" color="rgba(255,255,255,0.5)" fontSize={{ base: '13px', md: '15px' }}>
              Family tree, social feed, messages — all in one place.
            </Box>
          </Text>

          {/* Feature pills */}
          <HStack spacing={2} flexWrap="wrap" pt={2}>
            {['🌳 மரம்', '📸 பதிவுகள்', '💬 செய்தி', '🎂 பிறந்தநாள்'].map((f, i) => (
              <Box key={i}
                px={3} py={1} borderRadius="full"
                bg="rgba(255,255,255,0.15)"
                border="1px solid rgba(255,255,255,0.25)"
              >
                <Text fontSize="12px" color="white" fontWeight="600">{f}</Text>
              </Box>
            ))}
          </HStack>
        </VStack>
      </Box>

      {/* ── LOGIN CARD ──────────────────────────────────────── */}
      <Box px={{ base: 4, md: 8 }} maxW="520px" mx="auto" mt={-8} pb={16} position="relative" zIndex={10}>
        <Box
          bg="white"
          borderRadius="3xl"
          boxShadow="0 20px 60px rgba(124,58,237,0.15), 0 4px 16px rgba(0,0,0,0.08)"
          border="1px solid" borderColor="purple.100"
          px={{ base: 6, md: 8 }}
          py={8}
        >
          <VStack spacing={5} align="stretch">

            {/* Login header */}
            <VStack spacing={1} align="flex-start">
              <Text fontSize="22px" fontWeight="800" color="purple.900">
                உள்நுழைக 👋
              </Text>
              <Text fontSize="13px" color="gray.400">
                Sign in to your family network
              </Text>
            </VStack>

            {/* OTP / Password toggle */}
            <HStack
              bg="purple.50" borderRadius="xl" p={1}
              border="1px solid" borderColor="purple.100"
            >
              {[
                { key: 'otp',      label: '📱 OTP'         },
                { key: 'password', label: '🔑 கடவுச்சொல்' },
              ].map(t => (
                <Button key={t.key} flex={1} size="sm" h="38px"
                  bg={activeTab === t.key ? 'white' : 'transparent'}
                  color={activeTab === t.key ? 'purple.700' : 'gray.400'}
                  borderRadius="lg" fontWeight="700" fontSize="13px"
                  boxShadow={activeTab === t.key ? '0 1px 6px rgba(124,58,237,0.15)' : 'none'}
                  onClick={() => { setActiveTab(t.key); setError(''); }}
                  _hover={{ bg: activeTab === t.key ? 'white' : 'purple.100' }}
                  transition="all 0.2s"
                >
                  {t.label}
                </Button>
              ))}
            </HStack>

            {/* Phone input */}
            <InputGroup size="lg">
              <InputLeftAddon
                bg="purple.50"
                border="1.5px solid" borderColor="purple.200"
                color="purple.700" fontSize="13px" fontWeight="700"
                h="52px" px={4} borderLeftRadius="xl"
              >
                🇮🇳 +91
              </InputLeftAddon>
              <Input
                type="tel" maxLength={10}
                placeholder="தொலைபேசி எண் / Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && (activeTab === 'otp' ? handleSendOTP() : handlePasswordLogin())}
                bg="white"
                border="1.5px solid" borderColor="purple.200"
                borderLeftColor="transparent"
                color="purple.900" fontSize="18px" letterSpacing="3px" h="52px"
                borderRightRadius="xl"
                _placeholder={{ color: 'purple.200', letterSpacing: '0', fontSize: '14px' }}
                _focus={{ borderColor: 'purple.500', borderLeftColor: 'purple.500', boxShadow: '0 0 0 3px rgba(124,58,237,0.1)' }}
              />
            </InputGroup>

            {/* Password input */}
            {activeTab === 'password' && (
              <InputGroup size="lg">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="கடவுச்சொல் / Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                  bg="white" border="1.5px solid" borderColor="purple.200"
                  color="purple.900" fontSize="lg" h="52px" borderRadius="xl"
                  _placeholder={{ color: 'purple.200', fontSize: '14px' }}
                  _focus={{ borderColor: 'purple.500', boxShadow: '0 0 0 3px rgba(124,58,237,0.1)' }}
                />
                <InputRightElement h="52px" pr={3}>
                  <Text fontSize="xl" cursor="pointer" userSelect="none"
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
                <Text color="red.600" fontSize="13px" fontWeight="600">{error}</Text>
              </Box>
            )}

            <div id="recaptcha-container" />

            {/* Submit */}
            <Button
              w="100%" h="52px"
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" fontSize="16px" fontWeight="800"
              borderRadius="xl"
              isLoading={loading}
              loadingText={activeTab === 'otp' ? 'OTP அனுப்புகிறோம்...' : 'உள்நுழைகிறோம்...'}
              isDisabled={activeTab === 'otp' ? phone.length < 10 : phone.length < 10 || password.length < 6}
              onClick={activeTab === 'otp' ? handleSendOTP : handlePasswordLogin}
              boxShadow="0 4px 16px rgba(124,58,237,0.3)"
              _hover={{ transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(124,58,237,0.4)' }}
              _disabled={{ opacity: 0.5, cursor: 'not-allowed', transform: 'none', boxShadow: 'none' }}
              transition="all 0.2s"
            >
              {activeTab === 'otp' ? '📱 OTP அனுப்பு →' : '🔑 உள்நுழை →'}
            </Button>

            {/* Trust badges */}
            <HStack justify="center" spacing={6}>
              {[
                { icon: '🔐', label: 'Secure' },
                { icon: '⚡', label: 'Instant' },
                { icon: '🆓', label: 'Free'    },
              ].map((t, i) => (
                <VStack key={i} spacing={0}>
                  <Text fontSize="18px">{t.icon}</Text>
                  <Text fontSize="10px" color="gray.400" fontWeight="600">{t.label}</Text>
                </VStack>
              ))}
            </HStack>

          </VStack>
        </Box>

        {/* ── FEATURES GRID ─────────────────────────────────── */}
        <Box mt={6}>
          <Text fontSize="13px" fontWeight="700" color="purple.400"
            textAlign="center" mb={4} letterSpacing="wider" textTransform="uppercase">
            What's inside frootze
          </Text>
          <SimpleGrid columns={3} spacing={3}>
            {features.map((f, i) => (
              <Box key={i}
                bg="white" border="1.5px solid" borderColor="purple.100"
                borderRadius="2xl" py={4} px={3}
                textAlign="center"
                boxShadow="0 1px 6px rgba(124,58,237,0.06)"
                _hover={{ borderColor: 'purple.300', transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(124,58,237,0.12)' }}
                transition="all 0.2s"
              >
                <Text fontSize="28px" mb={2}>{f.icon}</Text>
                <Text fontSize="11px" fontWeight="800" color="purple.800">{f.ta}</Text>
                <Text fontSize="10px" color="gray.400" mt={0.5}>{f.en}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* Footer */}
        <Text textAlign="center" fontSize="11px" color="gray.400" mt={6}>
          © 2026 frootze · Tamil Family Network · support@nalamini.com
        </Text>

      </Box>
    </Box>
  );
}
