import { useState, useEffect, useRef } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Button
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const { login } = useAuth();
  const phone = localStorage.getItem('pmf_pending_phone');
  const navigatingRef = useRef(false);

  useEffect(() => {
    // If token already exists — go directly to dashboard
    const existingToken = localStorage.getItem('pmf_token');
    if (existingToken) {
      window.location.href = '/dashboard';
      return;
    }
    if (!navigatingRef.current && (!phone || !window.confirmationResult)) {
      window.location.href = '/';
    }
  }, [phone]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleVerify = async () => {
    setError('');
    if (!otp || otp.length !== 6) { setError('6 இலக்க OTP உள்ளிடவும்'); return; }
    if (!window.confirmationResult) { window.location.href = '/'; return; }
    setLoading(true);

    try {
      const result = await window.confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();
      const res = await axios.post(`${BASE_URL}/api/auth/firebase-verify`, { id_token: idToken, phone });
      const { isNewUser, token, tempToken, user } = res.data;

      navigatingRef.current = true;
      window.confirmationResult = null;

      if (isNewUser) {
        localStorage.setItem('pmf_temp_token', tempToken);
        localStorage.removeItem('pmf_pending_phone');
        window.location.href = '/register';
      } else {
        login(token, user);
        localStorage.removeItem('pmf_pending_phone');
        window.location.href = '/dashboard';
      }

    } catch (err) {
      console.error('Verify error:', err.code, err.message);
      setLoading(false);

      // Check if token was actually saved despite error
      const savedToken = localStorage.getItem('pmf_token');
      if (savedToken) {
        window.location.href = '/dashboard';
        return;
      }

      if (err.code === 'auth/invalid-verification-code') {
        setError('தவறான OTP / Invalid OTP. Please try again.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP காலாவதி / OTP expired. Please resend.');
        setCanResend(true);
        setResendTimer(0);
      } else {
        setError(err.response?.data?.error || err.message || 'சரிபார்க்க தோல்வி / Verification failed');
      }
    }
  };

  const sectionBox = {
    w: '100%',
    bg: 'whiteAlpha.100',
    border: '1px solid',
    borderColor: 'whiteAlpha.200',
    borderRadius: '2xl',
    px: { base: 5, md: 8 },
    py: { base: 4, md: 5 },
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex" alignItems="center" justifyContent="center"
      px={{ base: 4, md: 8 }} py={10}>
      <VStack w="100%" maxW="900px" spacing={4} align="stretch">

        {/* Section 1 — Logo */}
        <Box {...sectionBox}>
          <HStack spacing={3}>
            <Box w="44px" h="44px" borderRadius="xl"
              bgGradient="linear(to-br, purple.500, purple.800)"
              display="flex" alignItems="center" justifyContent="center"
              fontSize="xl" boxShadow="0 4px 14px rgba(128,0,255,0.4)">
              🌳
            </Box>
            <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color="white">
              frootze
            </Text>
          </HStack>
        </Box>

        {/* Section 2 — Title */}
        <Box {...sectionBox} py={{ base: 3, md: 4 }}>
          <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" color="white" mb={1}>
            🔐 OTP சரிபார்க்கவும்
          </Heading>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.600">
            +91 {phone} க்கு OTP அனுப்பப்பட்டது
          </Text>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.400">
            OTP sent to +91 {phone}
          </Text>
        </Box>

        {/* Section 3 — OTP Input */}
        <Box {...sectionBox} py={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">

            <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.600" textAlign="center">
              உங்கள் தொலைபேசிக்கு வந்த 6 இலக்க OTP-ஐ உள்ளிடவும்
            </Text>

            {/* OTP Input */}
            <Box>
              <input
                type="tel"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                autoFocus
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '14px',
                  color: 'white',
                  fontSize: '28px',
                  fontWeight: '700',
                  textAlign: 'center',
                  letterSpacing: '12px',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </Box>

            {error && (
              <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}>
                <Text color="red.200" fontSize="sm">{error}</Text>
              </Box>
            )}

            <Button w="100%" h={{ base: '50px', md: '56px' }}
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
              isLoading={loading} loadingText="சரிபார்க்கிறோம்..."
              isDisabled={otp.length !== 6}
              onClick={handleVerify}
              _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
              _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
            >
              சரிபார்க்கவும் →
            </Button>

            <HStack justify="center">
              {canResend ? (
                <Text fontSize="sm" color="purple.300" fontWeight="600" cursor="pointer"
                  onClick={() => {
                    navigatingRef.current = true;
                    localStorage.removeItem('pmf_pending_phone');
                    window.confirmationResult = null;
                    window.location.href = '/';
                  }}
                  _hover={{ color: 'purple.100' }}>
                  ← OTP மீண்டும் அனுப்பு / Resend OTP
                </Text>
              ) : (
                <Text fontSize="sm" color="whiteAlpha.400">
                  மீண்டும் அனுப்ப {resendTimer}s / Resend in {resendTimer}s
                </Text>
              )}
            </HStack>

            <Text fontSize="sm" color="whiteAlpha.400" textAlign="center" cursor="pointer"
              onClick={() => {
                navigatingRef.current = true;
                localStorage.removeItem('pmf_pending_phone');
                window.confirmationResult = null;
                window.location.href = '/';
              }}
              _hover={{ color: 'white' }}>
              ← எண்ணை மாற்றவும் / Change number
            </Text>

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
