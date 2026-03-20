import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, FormControl, FormLabel, SimpleGrid
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const inputStyle = {
    bg: 'whiteAlpha.100',
    border: '1px solid',
    borderColor: 'whiteAlpha.300',
    color: 'white',
    h: { base: '50px', md: '56px' },
    fontSize: { base: 'md', md: 'lg' },
    _placeholder: { color: 'whiteAlpha.400' },
    _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
  };

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError('பெயர் உள்ளிடவும் / Enter your name'); return; }
    if (!gender) { setError('பாலினம் தேர்வு செய்யவும் / Select gender'); return; }
    setLoading(true);
    try {
      const phone = localStorage.getItem('pmf_pending_phone');
      const tempToken = localStorage.getItem('pmf_temp_token');
      const res = await registerUser({ name, gender, phone }, tempToken);
      login(res.data.token, res.data.user);
      localStorage.removeItem('pmf_pending_phone');
      localStorage.removeItem('pmf_temp_token');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'பதிவு தோல்வி / Registration failed');
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex" alignItems="center" justifyContent="center"
      px={{ base: 4, md: 8 }} py={10}>
      <VStack w="100%" maxW="900px" spacing={4} align="stretch">

        {/* Section 1 — Logo */}
        <Box w="100%" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={{ base: 5, md: 8 }} py={5}>
          <HStack spacing={3}>
            <Box w="44px" h="44px" borderRadius="xl" bgGradient="linear(to-br, purple.500, purple.800)"
              display="flex" alignItems="center" justifyContent="center" fontSize="xl"
              boxShadow="0 4px 14px rgba(128,0,255,0.4)">🌳</Box>
            <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color="white">frootze</Text>
          </HStack>
        </Box>

        {/* Section 2 — Title */}
        <Box w="100%" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={{ base: 5, md: 8 }} py={{ base: 3, md: 4 }}>
          <Heading fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" color="white" mb={1}>
            👤 உங்கள் விவரம் / Your Details
          </Heading>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">
            உங்கள் குடும்ப மரத்தை உருவாக்க தொடங்குங்கள்
          </Text>
        </Box>

        {/* Section 3 — Form */}
        <Box w="100%" bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" px={{ base: 5, md: 8 }} py={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>
                பெயர் / Name *
              </FormLabel>
              <Input
                placeholder="உங்கள் பெயர் / Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                {...inputStyle}
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>
                பாலினம் / Gender *
              </FormLabel>
              <Select
                placeholder="தேர்வு செய்யவும் / Select"
                value={gender}
                onChange={e => setGender(e.target.value)}
                {...inputStyle}
              >
                <option value="male" style={{ background: '#1e1b4b' }}>ஆண் / Male</option>
                <option value="female" style={{ background: '#1e1b4b' }}>பெண் / Female</option>
                <option value="other" style={{ background: '#1e1b4b' }}>மற்றவை / Other</option>
              </Select>
            </FormControl>

            {error && (
              <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}>
                <Text color="red.200" fontSize="sm">{error}</Text>
              </Box>
            )}

            <Button
              w="100%" h={{ base: '50px', md: '56px' }}
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
              isLoading={loading} loadingText="பதிவு செய்கிறோம்..."
              isDisabled={!name || !gender}
              onClick={handleRegister}
              _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
              _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
            >
              பதிவு செய்யவும் / Register →
            </Button>

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
