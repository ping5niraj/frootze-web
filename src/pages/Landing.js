import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button,
  Input, InputGroup, InputLeftAddon, SimpleGrid
} from '@chakra-ui/react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';

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
  { icon: '🌳', ta: 'குடும்ப மரம்', en: 'Family Tree' },
  { icon: '📍', ta: 'இட பகிர்வு',   en: 'Location'    },
  { icon: '🎂', ta: 'பிறந்தநாள்',   en: 'Birthdays'   },
  { icon: '🧠', ta: 'வினாடி வினா',  en: 'Daily Quiz'  },
  { icon: '💬', ta: 'செய்திகள்',    en: 'Messages'    },
  { icon: '✅', ta: 'சரிபார்க்கப்பட்டது', en: 'Verified' },
];

export default function Landing() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('சரியான 10 இலக்க எண் உள்ளிடவும் / Enter valid 10-digit number');
      return;
    }
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
      else if (err.code === 'auth/too-many-requests') setError('அதிக முயற்சி / Too many attempts');
      else setError('OTP அனுப்ப தோல்வி / Failed to send OTP');
    } finally { setLoading(false); }
  };

  return (
    <Box
      minH="100vh"
      w="100vw"
      bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={10}
      px={{ base: 4, sm: 6, md: 10, lg: 20 }}
    >
      <VStack
        w="100%"
        maxW="900px"
        spacing={4}
        align="stretch"
      >

        {/* ── SECTION 1 — Logo ── */}
        <Box
          w="100%"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="2xl"
          px={{ base: 5, md: 8 }}
          py={5}
        >
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Box
                w={{ base: '42px', md: '52px' }}
                h={{ base: '42px', md: '52px' }}
                borderRadius="xl"
                bgGradient="linear(to-br, purple.500, purple.800)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize={{ base: 'xl', md: '2xl' }}
                flexShrink={0}
                boxShadow="0 4px 14px rgba(128,0,255,0.4)"
              >
                🌳
              </Box>
              <Text
                fontSize={{ base: '3xl', md: '4xl' }}
                fontWeight="800"
                color="white"
                letterSpacing="-1px"
              >
                frootze
              </Text>
            </HStack>
            <Box
              px={4} py={2}
              borderRadius="full"
              bg="purple.800"
              border="1px solid"
              borderColor="purple.600"
            >
              <Text
                fontSize={{ base: 'xs', md: 'sm' }}
                fontWeight="600"
                color="purple.200"
                letterSpacing="wider"
              >
                Tamil Family Network
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* ── SECTION 2 — Hero Text ── */}
        <Box
          w="100%"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="2xl"
          px={{ base: 5, md: 8 }}
          py={{ base: 3, md: 4 }}
        >
          <Heading
            fontSize={{ base: 'xl', sm: '2xl', md: '3xl' }}
            fontWeight="700"
            color="white"
            lineHeight="1.2"
            letterSpacing="-0.5px"
            mb={2}
          >
            உங்கள் குடும்ப மரத்தை{' '}
            <Box
              as="span"
              bgGradient="linear(to-r, purple.300, green.300)"
              bgClip="text"
            >
              உருவாக்குங்கள்
            </Box>
          </Heading>
          <Text
            fontSize={{ base: 'sm', md: 'md' }}
            color="whiteAlpha.700"
            mb={1}
          >
            உங்கள் குடும்பம். உங்கள் வேர்கள்.
          </Text>
          <Text
            fontSize={{ base: 'sm', md: 'md' }}
            color="whiteAlpha.400"
          >
            Your Family. Your Roots. Connect generations.
          </Text>
        </Box>

        {/* ── SECTION 3 — Feature Icons ── */}
        <Box
          w="100%"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="2xl"
          px={{ base: 5, md: 8 }}
          py={{ base: 5, md: 6 }}
        >
          <SimpleGrid columns={{ base: 3, sm: 6 }} spacing={4}>
            {features.map((f, i) => (
              <VStack key={i} spacing={1} align="center">
                <Box
                  w={{ base: '44px', md: '52px' }}
                  h={{ base: '44px', md: '52px' }}
                  borderRadius="xl"
                  bg="whiteAlpha.100"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize={{ base: 'xl', md: '2xl' }}
                >
                  {f.icon}
                </Box>
                <Text
                  fontSize={{ base: '10px', md: 'xs' }}
                  fontWeight="600"
                  color="whiteAlpha.800"
                  textAlign="center"
                >
                  {f.ta}
                </Text>
                <Text
                  fontSize={{ base: '10px', md: 'xs' }}
                  color="whiteAlpha.400"
                  textAlign="center"
                >
                  {f.en}
                </Text>
              </VStack>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── SECTION 4 — Login Input ── */}
        <Box
          w="100%"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="2xl"
          px={{ base: 5, md: 8 }}
          py={{ base: 6, md: 8 }}
        >
          <VStack spacing={5} align="stretch">

            <Box>
              <Heading
                fontSize={{ base: 'xl', md: '2xl' }}
                fontWeight="700"
                color="white"
                mb={1}
              >
                உள்நுழைக 👋
              </Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">
                Sign in to continue to frootze
              </Text>
            </Box>

            {/* Phone Input */}
            <InputGroup size="lg">
              <InputLeftAddon
                bg="whiteAlpha.200"
                border="1px solid"
                borderColor="whiteAlpha.300"
                color="white"
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight="600"
                h={{ base: '50px', md: '56px' }}
                px={4}
              >
                🇮🇳 +91
              </InputLeftAddon>
              <Input
                type="tel"
                maxLength={10}
                placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                bg="whiteAlpha.100"
                border="1px solid"
                borderColor="whiteAlpha.300"
                color="white"
                fontSize={{ base: 'xl', md: '2xl' }}
                letterSpacing="4px"
                h={{ base: '50px', md: '56px' }}
                _placeholder={{ color: 'whiteAlpha.300', letterSpacing: '0', fontSize: 'md' }}
                _focus={{
                  borderColor: 'purple.400',
                  boxShadow: '0 0 0 3px rgba(128,0,255,0.2)',
                  bg: 'whiteAlpha.200',
                }}
              />
            </InputGroup>

            {error && (
              <Box
                bg="red.900"
                border="1px solid"
                borderColor="red.500"
                borderRadius="xl"
                px={4} py={3}
              >
                <Text color="red.200" fontSize="sm">{error}</Text>
              </Box>
            )}

            <Box id="recaptcha-container" />

            <Button
              w="100%"
              h={{ base: '50px', md: '56px' }}
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white"
              fontSize={{ base: 'md', md: 'lg' }}
              fontWeight="700"
              borderRadius="xl"
              isLoading={loading}
              loadingText="OTP அனுப்புகிறோம்..."
              isDisabled={phone.length < 10}
              onClick={handleSendOTP}
              _hover={{
                bgGradient: 'linear(to-r, purple.700, green.600)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(128,0,255,0.4)',
              }}
              _active={{ transform: 'translateY(0)' }}
              _disabled={{ opacity: 0.4, cursor: 'not-allowed', transform: 'none' }}
              transition="all 0.2s ease"
            >
              📱 OTP அனுப்பு →
            </Button>

            <HStack justify="center" spacing={8}>
              {['🔐 Secure', '⚡ Instant', '🆓 Free'].map((t, i) => (
                <Text key={i} fontSize={{ base: 'xs', md: 'sm' }} color="whiteAlpha.400">{t}</Text>
              ))}
            </HStack>

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
