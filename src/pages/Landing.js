import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button,
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
  { icon: '🌳', ta: 'குடும்ப மரம்',  en: 'Family Tree'      },
  { icon: '📍', ta: 'இட பகிர்வு',    en: 'Location Sharing' },
  { icon: '🎂', ta: 'பிறந்தநாள்',    en: 'Birthdays'        },
  { icon: '🧠', ta: 'வினாடி வினா',   en: 'Daily Quiz'       },
  { icon: '💬', ta: 'செய்திகள்',     en: 'Messages'         },
  { icon: '✅', ta: 'சரிபார்க்கப்பட்டது', en: 'Verified'   },
];

const sectionBox = {
  w: '100%',
  bg: 'white',
  border: '1px solid',
  borderColor: 'purple.100',
  borderRadius: '2xl',
  px: { base: 5, md: 8 },
};

export default function Landing() {
  const [activeTab, setActiveTab] = useState('otp');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // OTP Login
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
      if (err.code === 'auth/invalid-phone-number') setError('தவறான எண் / Invalid number');
      else if (err.code === 'auth/too-many-requests') setError('அதிக முயற்சி / Too many attempts. Please wait or use password login.');
      else setError('OTP அனுப்ப தோல்வி / Failed to send OTP');
    } finally { setLoading(false); }
  };

  // Password Login
  const handlePasswordLogin = async () => {
    setError('');
    if (!phone || phone.length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
    if (!password || password.length < 6) { setError('கடவுச்சொல் உள்ளிடவும் / Enter password'); return; }
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
    <Box minH="100vh" w="100vw" bgGradient="linear(135deg, #f5f3ff 0%, #ede9fe 100%)"
      display="flex" alignItems="center" justifyContent="center"
      py={10} px={{ base: 4, md: 8 }}>
      <VStack w="100%" maxW="900px" spacing={4} align="stretch">

        {/* Section 1 — Logo */}
        <Box {...sectionBox} py={5}>
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Box w={{ base: '42px', md: '52px' }} h={{ base: '42px', md: '52px' }}
                borderRadius="xl" bgGradient="linear(to-br, purple.500, purple.800)"
                display="flex" alignItems="center" justifyContent="center"
                fontSize={{ base: 'xl', md: '2xl' }} boxShadow="0 4px 14px rgba(128,0,255,0.4)">
                🌳
              </Box>
              <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight="800" color="purple.900" letterSpacing="-1px">
                frootze
              </Text>
            </HStack>
            <Box px={4} py={2} borderRadius="full" bg="purple.800" border="1px solid" borderColor="purple.600">
              <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600" color="purple.200" letterSpacing="wider">
                Tamil Family Network
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Section 2 — Hero Text */}
        <Box {...sectionBox} py={{ base: 3, md: 4 }}>
          <Heading fontSize={{ base: 'xl', sm: '2xl', md: '3xl' }} fontWeight="700" color="purple.900" lineHeight="1.2" letterSpacing="-0.5px" mb={2}>
            உங்கள் குடும்ப மரத்தை{' '}
            <Box as="span" bgGradient="linear(to-r, purple.300, green.300)" bgClip="text">
              உருவாக்குங்கள்
            </Box>
          </Heading>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.500" mb={1}>
            உங்கள் குடும்பம். உங்கள் வேர்கள்.
          </Text>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.400">
            Your Family. Your Roots. Connect generations.
          </Text>
        </Box>

        {/* Section 3 — Features */}
        <Box {...sectionBox} py={{ base: 4, md: 5 }}>
          <SimpleGrid columns={{ base: 3, sm: 6 }} spacing={3}>
            {features.map((f, i) => (
              <VStack key={i} spacing={1} align="center">
                <Box w={{ base: '40px', md: '48px' }} h={{ base: '40px', md: '48px' }}
                  borderRadius="xl" bg="white" border="1px solid" borderColor="whiteAlpha.200"
                  display="flex" alignItems="center" justifyContent="center"
                  fontSize={{ base: 'lg', md: 'xl' }}>
                  {f.icon}
                </Box>
                <Text fontSize={{ base: '10px', md: 'xs' }} fontWeight="600" color="gray.700" textAlign="center">{f.ta}</Text>
                <Text fontSize={{ base: '10px', md: 'xs' }} color="gray.400" textAlign="center">{f.en}</Text>
              </VStack>
            ))}
          </SimpleGrid>
        </Box>

        {/* Section 4 — Login */}
        <Box {...sectionBox} py={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">

            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" color="purple.900" mb={1}>
                உள்நுழைக 👋
              </Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.500">
                Sign in to continue to frootze
              </Text>
            </Box>

            {/* Tab Toggle */}
            <HStack bg="white" borderRadius="xl" p={1}>
              <Button flex={1} size="sm" h="40px"
                bg={activeTab === 'otp' ? 'purple.600' : 'white'}
                color={activeTab === 'otp' ? 'white' : 'purple.600'}
                borderRadius="lg" fontWeight="600"
                onClick={() => { setActiveTab('otp'); setError(''); }}
                _hover={{ bg: activeTab === 'otp' ? 'purple.600' : 'whiteAlpha.100' }}>
                📱 OTP உள்நுழைவு
              </Button>
              <Button flex={1} size="sm" h="40px"
                bg={activeTab === 'password' ? 'purple.600' : 'white'}
                color={activeTab === 'password' ? 'white' : 'purple.600'}
                borderRadius="lg" fontWeight="600"
                onClick={() => { setActiveTab('password'); setError(''); }}
                _hover={{ bg: activeTab === 'password' ? 'purple.600' : 'whiteAlpha.100' }}>
                🔑 கடவுச்சொல்
              </Button>
            </HStack>

            {/* Phone Input — shared */}
            <InputGroup size="lg">
              <InputLeftAddon
                bg="whiteAlpha.200" border="1px solid" borderColor="whiteAlpha.300"
                color="purple.900" fontSize="sm" fontWeight="600" h="52px" px={4}>
                🇮🇳 +91
              </InputLeftAddon>
              <Input
                type="tel" maxLength={10} placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && (activeTab === 'otp' ? handleSendOTP() : handlePasswordLogin())}
                bg="white" border="1px solid" borderColor="whiteAlpha.300"
                color="purple.900" fontSize="xl" letterSpacing="3px" h="52px"
                _placeholder={{ color: 'whiteAlpha.300', letterSpacing: '0', fontSize: 'md' }}
                _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' }}
              />
            </InputGroup>

            {/* Password Input — only for password tab */}
            {activeTab === 'password' && (
              <InputGroup size="lg">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="கடவுச்சொல் / Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
                  bg="white" border="1px solid" borderColor="whiteAlpha.300"
                  color="purple.900" fontSize="lg" h="52px"
                  _placeholder={{ color: 'whiteAlpha.300', fontSize: 'md' }}
                  _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' }}
                />
                <InputRightElement h="52px" pr={3}>
                  <Text fontSize="xl" cursor="pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </InputRightElement>
              </InputGroup>
            )}

            {error && (
              <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="xl" px={4} py={3}>
                <Text color="red.600" fontSize="sm">{error}</Text>
              </Box>
            )}

            <div id="recaptcha-container" />

            {/* Submit Button */}
            <Button
              w="100%" h={{ base: '50px', md: '56px' }}
              bgGradient="linear(to-r, purple.600, green.500)"
              color="purple.900" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
              isLoading={loading}
              loadingText={activeTab === 'otp' ? 'OTP அனுப்புகிறோம்...' : 'உள்நுழைகிறோம்...'}
              isDisabled={activeTab === 'otp' ? phone.length < 10 : phone.length < 10 || password.length < 6}
              onClick={activeTab === 'otp' ? handleSendOTP : handlePasswordLogin}
              _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
              _disabled={{ opacity: 0.4, cursor: 'not-allowed', transform: 'none' }}
              transition="all 0.2s ease"
            >
              {activeTab === 'otp' ? '📱 OTP அனுப்பு →' : '🔑 உள்நுழை →'}
            </Button>

            <HStack justify="center" spacing={8}>
              {['🔐 Secure', '⚡ Instant', '🆓 Free'].map((t, i) => (
                <Text key={i} fontSize={{ base: 'xs', md: 'sm' }} color="gray.400">{t}</Text>
              ))}
            </HStack>

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
