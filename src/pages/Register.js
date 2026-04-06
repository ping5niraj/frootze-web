import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, FormControl, FormLabel, InputGroup, InputRightElement
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

export default function Register() {
  const [step, setStep] = useState(1); // Step 1: Details, Step 2: Password
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userToken, setUserToken] = useState('');
  const { login } = useAuth();

  const inputStyle = {
  bg: 'purple.50', border: '1.5px solid', borderColor: 'purple.200',
  color: 'purple.900', h: '44px', fontSize: 'sm',
  _placeholder: { color: 'purple.300' },
  _focus: { bg: 'white', borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(124,58,237,0.1)' },
};


  const sectionBox = {
    w: '100%', bg: 'white', border: '1px solid', borderColor: 'purple.100',
    borderRadius: '2xl', px: { base: 5, md: 8 },
  };

  // Step 1 — Register basic details
  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError('பெயர் உள்ளிடவும் / Enter your name'); return; }
    if (!gender) { setError('பாலினம் தேர்வு செய்யவும் / Select gender'); return; }
    setLoading(true);
    try {
      const phone = localStorage.getItem('pmf_pending_phone');
      const tempToken = localStorage.getItem('pmf_temp_token');
      const res = await registerUser({ name, gender, phone }, tempToken);
      setUserToken(res.data.token);
      login(res.data.token, res.data.user);
      setStep(2); // Go to password step
    } catch (err) {
      setError(err.response?.data?.error || 'பதிவு தோல்வி / Registration failed');
    } finally { setLoading(false); }
  };

  // Step 2 — Set password
  const handleSetPassword = async () => {
    setError('');
    if (password.length < 6) { setError('கடவுச்சொல் குறைந்தது 6 எழுத்து / Min 6 characters'); return; }
    if (password !== confirmPassword) { setError('கடவுச்சொற்கள் பொருந்தவில்லை / Passwords do not match'); return; }
    setLoading(true);
    try {
      const token = userToken || localStorage.getItem('pmf_token');
      await axios.post(`${BASE_URL}/api/auth/set-password`, { password, token });
      localStorage.removeItem('pmf_pending_phone');
      localStorage.removeItem('pmf_temp_token');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'கடவுச்சொல் அமைக்க தோல்வி');
    } finally { setLoading(false); }
  };

  // Skip password
  const handleSkip = () => {
    localStorage.removeItem('pmf_pending_phone');
    localStorage.removeItem('pmf_temp_token');
    window.location.href = '/dashboard';
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(135deg, #f5f3ff 0%, #ede9fe 100%)"
      display="flex" alignItems="center" justifyContent="center"
      px={{ base: 4, md: 8 }} py={10}>
      <VStack w="100%" maxW="900px" spacing={4} align="stretch">

        {/* Section 1 — Logo */}
        <Box {...sectionBox} py={5}>
          <HStack spacing={3}>
            <Box w="44px" h="44px" borderRadius="xl" bgGradient="linear(to-br, purple.500, purple.800)"
              display="flex" alignItems="center" justifyContent="center" fontSize="xl"
              boxShadow="0 4px 14px rgba(128,0,255,0.4)">🌳</Box>
            <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color="purple.900">frootze</Text>
          </HStack>
        </Box>

        {/* Section 2 — Step Indicator */}
        <Box {...sectionBox} py={{ base: 3, md: 4 }}>
          <HStack spacing={4}>
            <Box w="28px" h="28px" borderRadius="full"
              bg={step >= 1 ? 'purple.500' : 'whiteAlpha.200'}
              display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="sm" color="purple.900" fontWeight="700">1</Text>
            </Box>
            <Box h="2px" flex={1} bg={step >= 2 ? 'purple.500' : 'whiteAlpha.200'} borderRadius="full" />
            <Box w="28px" h="28px" borderRadius="full"
              bg={step >= 2 ? 'purple.500' : 'whiteAlpha.200'}
              display="flex" alignItems="center" justifyContent="center">
              <Text fontSize="sm" color="purple.900" fontWeight="700">2</Text>
            </Box>
          </HStack>
          <HStack justify="space-between" mt={2}>
            <Text fontSize="xs" color={step >= 1 ? 'purple.300' : 'whiteAlpha.400'}>விவரங்கள்</Text>
            <Text fontSize="xs" color={step >= 2 ? 'purple.300' : 'whiteAlpha.400'}>கடவுச்சொல்</Text>
          </HStack>
        </Box>

        {/* Step 1 — Basic Details */}
        {step === 1 && (
          <Box {...sectionBox} py={{ base: 6, md: 8 }}>
            <VStack spacing={5} align="stretch">
              <Box>
                <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" color="purple.900" mb={1}>
                  👤 உங்கள் விவரம்
                </Heading>
                <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.500">
                  Your details to get started
                </Text>
              </Box>

              <FormControl>
                <FormLabel color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>பெயர் / Name *</FormLabel>
                <Input placeholder="உங்கள் பெயர்" value={name} onChange={e => setName(e.target.value)} {...inputStyle} />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>பாலினம் / Gender *</FormLabel>
                <Select placeholder="தேர்வு செய்யவும்" value={gender} onChange={e => setGender(e.target.value)} {...inputStyle}>
                  <option value="male" style={{ background: 'white', color: '#1a1a2e' }}>ஆண் / Male</option>
                  <option value="female" style={{ background: 'white', color: '#1a1a2e' }}>பெண் / Female</option>
                  <option value="other" style={{ background: 'white', color: '#1a1a2e' }}>மற்றவை / Other</option>
                </Select>
              </FormControl>

              {error && <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="xl" px={4} py={3}><Text color="red.600" fontSize="sm">{error}</Text></Box>}

              <Button w="100%" h={{ base: '50px', md: '56px' }}
                bgGradient="linear(to-r, purple.600, green.500)"
                color="purple.900" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={loading} loadingText="பதிவு செய்கிறோம்..."
                isDisabled={!name || !gender}
                onClick={handleRegister}
                _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                அடுத்தது / Next →
              </Button>
            </VStack>
          </Box>
        )}

        {/* Step 2 — Set Password */}
        {step === 2 && (
          <Box {...sectionBox} py={{ base: 6, md: 8 }}>
            <VStack spacing={5} align="stretch">
              <Box>
                <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" color="purple.900" mb={1}>
                  🔑 கடவுச்சொல் அமைக்கவும்
                </Heading>
                <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.500">
                  Set a password for quick login next time
                </Text>
              </Box>

              <FormControl>
                <FormLabel color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>கடவுச்சொல் / Password</FormLabel>
                <InputGroup size="lg">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="குறைந்தது 6 எழுத்து / Min 6 chars"
                    value={password} onChange={e => setPassword(e.target.value)}
                    {...inputStyle}
                  />
                  <InputRightElement h={{ base: '50px', md: '56px' }} pr={3}>
                    <Text fontSize="xl" cursor="pointer" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? '🙈' : '👁️'}
                    </Text>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600" fontSize={{ base: 'sm', md: 'md' }}>உறுதிப்படுத்தவும் / Confirm</FormLabel>
                <Input
                  type="password"
                  placeholder="கடவுச்சொலை மீண்டும் உள்ளிடவும்"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  {...inputStyle}
                />
              </FormControl>

              {error && <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="xl" px={4} py={3}><Text color="red.600" fontSize="sm">{error}</Text></Box>}

              <Button w="100%" h={{ base: '50px', md: '56px' }}
                bgGradient="linear(to-r, purple.600, green.500)"
                color="purple.900" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={loading} loadingText="அமைக்கிறோம்..."
                isDisabled={password.length < 6 || password !== confirmPassword}
                onClick={handleSetPassword}
                _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                கடவுச்சொல் அமை / Set Password →
              </Button>

              <Button w="100%" variant="ghost" color="gray.500" fontSize="sm"
                onClick={handleSkip} _hover={{ color: 'purple.900' }}>
                இப்போது வேண்டாம் / Skip for now
              </Button>

            </VStack>
          </Box>
        )}

      </VStack>
    </Box>
  );
}
