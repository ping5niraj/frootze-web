import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, VStack, HStack, Text, Heading, Input, Select, Avatar, Badge, SimpleGrid } from '@chakra-ui/react';
import api from '../services/api';

const sectionBox = { w: '100%', bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.200', borderRadius: '2xl', px: { base: 5, md: 8 }, py: { base: 4, md: 5 } };
const inputStyle = { bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white', h: '44px', fontSize: 'sm', _placeholder: { color: 'whiteAlpha.400' }, _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' } };

export default function Directory() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/users/directory').then(res => {
      setMembers(res.data.members || []);
      setFiltered(res.data.members || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(members.filter(m => m.name?.toLowerCase().includes(q) || m.district?.toLowerCase().includes(q) || m.kutham?.toLowerCase().includes(q)));
  }, [search, members]);

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" px={{ base: 4, md: 8 }} py={6} pb={24}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        <Box {...sectionBox}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">📚 குடும்ப அகராதி</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Family Directory · {members.length} members</Text>
            </Box>
          </HStack>
        </Box>

        <Box {...sectionBox}>
          <Input placeholder="🔍 பெயர், மாவட்டம் தேடுங்கள் / Search..." value={search} onChange={e => setSearch(e.target.value)} {...inputStyle} />
        </Box>

        <Box {...sectionBox}>
          {loading ? (
            <Text color="whiteAlpha.500" textAlign="center" py={6}>ஏற்றுகிறோம்... / Loading...</Text>
          ) : filtered.length === 0 ? (
            <Text color="whiteAlpha.500" textAlign="center" py={6}>யாரும் இல்லை / No members found</Text>
          ) : (
            <VStack spacing={3} align="stretch">
              {filtered.map(m => (
                <HStack key={m.id} bg="whiteAlpha.100" borderRadius="xl" px={4} py={3} justify="space-between">
                  <HStack spacing={3}>
                    <Avatar size="md" name={m.name} src={m.profile_photo} border="2px solid" borderColor="purple.400" />
                    <Box>
                      <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" color="white">{m.name}</Text>
                      <Text fontSize="xs" color="whiteAlpha.500">{m.relation_tamil}</Text>
                      {m.district && <Text fontSize="xs" color="whiteAlpha.400">📍 {m.district}</Text>}
                    </Box>
                  </HStack>
                  {m.kutham && <Badge colorScheme="purple" borderRadius="full" px={2} fontSize="xs">{m.kutham}</Badge>}
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

      </VStack>
    </Box>
  );
}
