import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Input,
  Select, Avatar, Badge, SimpleGrid, Button
} from '@chakra-ui/react';
import api from '../services/api';

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid',
  borderColor: 'whiteAlpha.200', borderRadius: '2xl',
  px: { base: 5, md: 8 }, py: { base: 4, md: 5 }
};
const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300',
  color: 'white', h: '44px', fontSize: 'sm',
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' }
};

export default function Directory() {
  const navigate = useNavigate();
  const [allMembers, setAllMembers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch]       = useState('');
  const [filterKutham, setFilterKutham]   = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterPincode, setFilterPincode]   = useState('');

  // Unique values for dropdowns
  const [kuthams, setKuthams]     = useState([]);
  const [districts, setDistricts] = useState([]);
  const [pincodes, setPincodes]   = useState([]);

  useEffect(() => {
    // Load all users — remove the kutham filter so ALL users show
    api.get('/api/users/directory?all=true').then(res => {
      const data = res.data.users || res.data.members || [];
      setAllMembers(data);
      setFiltered(data);

      // Build unique filter options
      setKuthams([...new Set(data.map(m => m.kutham).filter(Boolean))].sort());
      setDistricts([...new Set(data.map(m => m.district).filter(Boolean))].sort());
      setPincodes([...new Set(data.map(m => m.pincode).filter(Boolean))].sort());
    }).catch(() => {
      setAllMembers([]); setFiltered([]);
    }).finally(() => setLoading(false));
  }, []);

  // Apply filters whenever any filter changes
  useEffect(() => {
    let result = allMembers;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.district?.toLowerCase().includes(q) ||
        m.kutham?.toLowerCase().includes(q) ||
        m.pincode?.includes(q)
      );
    }
    if (filterKutham)   result = result.filter(m => m.kutham === filterKutham);
    if (filterDistrict) result = result.filter(m => m.district === filterDistrict);
    if (filterPincode)  result = result.filter(m => m.pincode === filterPincode);

    setFiltered(result);
  }, [search, filterKutham, filterDistrict, filterPincode, allMembers]);

  const clearFilters = () => {
    setSearch(''); setFilterKutham('');
    setFilterDistrict(''); setFilterPincode('');
  };

  const hasFilters = search || filterKutham || filterDistrict || filterPincode;

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6} pb={24}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')}
              color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">📚 குடும்ப அகராதி</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">
                Family Directory · {filtered.length} / {allMembers.length} members
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Search + Filters */}
        <Box {...sectionBox}>
          <VStack spacing={3} align="stretch">
            <Input
              placeholder="🔍 பெயர், தொலைபேசி, மாவட்டம் தேடுங்கள் / Search name, phone, district..."
              value={search} onChange={e => setSearch(e.target.value)}
              {...inputStyle} />

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <Select
                placeholder="🏷️ குலம் / Kutham"
                value={filterKutham}
                onChange={e => setFilterKutham(e.target.value)}
                {...inputStyle}>
                {kuthams.map(k => (
                  <option key={k} value={k} style={{background:'#1e1b4b'}}>{k}</option>
                ))}
              </Select>

              <Select
                placeholder="📍 மாவட்டம் / District"
                value={filterDistrict}
                onChange={e => setFilterDistrict(e.target.value)}
                {...inputStyle}>
                {districts.map(d => (
                  <option key={d} value={d} style={{background:'#1e1b4b'}}>{d}</option>
                ))}
              </Select>

              <Select
                placeholder="📮 பின்கோட் / Pincode"
                value={filterPincode}
                onChange={e => setFilterPincode(e.target.value)}
                {...inputStyle}>
                {pincodes.map(p => (
                  <option key={p} value={p} style={{background:'#1e1b4b'}}>{p}</option>
                ))}
              </Select>
            </SimpleGrid>

            {hasFilters && (
              <Button size="sm" variant="ghost" color="whiteAlpha.500"
                onClick={clearFilters} _hover={{ color: 'white' }}>
                ✕ வடிகட்டல் நீக்கு / Clear Filters
              </Button>
            )}
          </VStack>
        </Box>

        {/* Results */}
        <Box {...sectionBox}>
          {loading ? (
            <Text color="whiteAlpha.500" textAlign="center" py={6}>
              ஏற்றுகிறோம்... / Loading...
            </Text>
          ) : filtered.length === 0 ? (
            <Text color="whiteAlpha.500" textAlign="center" py={6}>
              யாரும் இல்லை / No members found
            </Text>
          ) : (
            <VStack spacing={3} align="stretch">
              {filtered.map(m => (
                <HStack key={m.id} bg="whiteAlpha.100" borderRadius="xl"
                  px={4} py={3} justify="space-between" flexWrap="wrap" gap={2}>
                  <HStack spacing={3}>
                    <Avatar size="md" name={m.name} src={m.profile_photo}
                      border="2px solid" borderColor="purple.400" />
                    <Box>
                      <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" color="white">
                        {m.name}
                      </Text>
                      {m.district && (
                        <Text fontSize="xs" color="whiteAlpha.400">📍 {m.district}</Text>
                      )}
                      {m.pincode && (
                        <Text fontSize="xs" color="whiteAlpha.400">📮 {m.pincode}</Text>
                      )}
                    </Box>
                  </HStack>
                  <HStack spacing={2} flexWrap="wrap">
                    {m.kutham ? (
                      <Badge colorScheme="purple" borderRadius="full" px={2} fontSize="xs">
                        {m.kutham}
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray" borderRadius="full" px={2} fontSize="xs">
                        No Kutham
                      </Badge>
                    )}
                    {m.gender && (
                      <Badge colorScheme={m.gender === 'male' ? 'blue' : 'pink'}
                        borderRadius="full" px={2} fontSize="xs">
                        {m.gender === 'male' ? 'ஆண்' : m.gender === 'female' ? 'பெண்' : 'மற்றவை'}
                      </Badge>
                    )}
                  </HStack>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

      </VStack>
    </Box>
  );
}
