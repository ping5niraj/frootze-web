import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  SimpleGrid, Spinner, Avatar, Badge
} from '@chakra-ui/react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

const api = (token) => axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
});

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid',
  borderColor: 'whiteAlpha.200', borderRadius: '2xl',
  px: { base: 5, md: 8 }, py: { base: 5, md: 6 }
};

const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white',
  h: '50px', fontSize: 'md',
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
};

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('pmf_admin_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [kuthams, setKuthams] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [newKutham, setNewKutham] = useState('');
  const [kuthamLoading, setKuthamLoading] = useState(false);
  const [kuthamError, setKuthamError] = useState('');
  const [kuthamSuccess, setKuthamSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isLoggedIn = !!token;

  useEffect(() => {
    if (isLoggedIn) {
      loadStats();
      loadKuthams();
    }
  }, [token]);

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError('');
    try {
      const res = await axios.post(`${BASE_URL}/api/admin/login`, { username, password });
      const t = res.data.token;
      setToken(t);
      localStorage.setItem('pmf_admin_token', t);
    } catch (e) {
      setLoginError(e.response?.data?.error || 'Login failed');
    } finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('pmf_admin_token');
  };

  const loadStats = async () => {
    try {
      const res = await api(token).get('/api/admin/stats');
      setStats(res.data.stats);
    } catch (e) { if (e.response?.status === 401) handleLogout(); }
  };

  const loadKuthams = async () => {
    try {
      const res = await api(token).get('/api/admin/kuthams');
      setKuthams(res.data.kuthams || []);
    } catch (e) {}
  };

  const loadUsers = async (q = '') => {
    setLoading(true);
    try {
      const res = await api(token).get(`/api/admin/users${q ? `?search=${q}` : ''}`);
      setUsers(res.data.users || []);
    } catch (e) {}
    finally { setLoading(false); }
  };

  const handleAddKutham = async () => {
    if (!newKutham.trim()) return;
    setKuthamLoading(true); setKuthamError(''); setKuthamSuccess('');
    try {
      await api(token).post('/api/admin/kuthams', { name: newKutham.trim() });
      setNewKutham('');
      setKuthamSuccess(`✅ "${newKutham.trim()}" சேர்க்கப்பட்டது / Added successfully`);
      loadKuthams();
    } catch (e) {
      setKuthamError(e.response?.data?.error || 'Failed to add');
    } finally { setKuthamLoading(false); }
  };

  const handleDeleteKutham = async (id, name) => {
    if (!window.confirm(`"${name}" நீக்கவுமா? / Delete "${name}"?`)) return;
    try {
      await api(token).delete(`/api/admin/kuthams/${id}`);
      loadKuthams();
    } catch (e) {}
  };

  // ── Login Page ──
  if (!isLoggedIn) {
    return (
      <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
        display="flex" alignItems="center" justifyContent="center" px={4}>
        <Box w="100%" maxW="400px" bg="whiteAlpha.100" border="1px solid"
          borderColor="whiteAlpha.200" borderRadius="2xl" px={8} py={10}>
          <VStack spacing={6}>
            <Text fontSize="3xl">🔐</Text>
            <Heading fontSize="2xl" color="white">Admin Login</Heading>
            <Text color="whiteAlpha.500" fontSize="sm">frootze.com Admin Panel</Text>

            <Input placeholder="Username" value={username}
              onChange={e => setUsername(e.target.value)} {...inputStyle} />
            <Input placeholder="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              {...inputStyle} />

            {loginError && (
              <Box bg="red.900" border="1px solid" borderColor="red.500"
                borderRadius="xl" px={4} py={3} w="100%">
                <Text color="red.200" fontSize="sm">{loginError}</Text>
              </Box>
            )}

            <Button w="100%" h="50px" bgGradient="linear(to-r, purple.600, green.500)"
              color="white" fontSize="lg" fontWeight="700" borderRadius="xl"
              isLoading={loginLoading} onClick={handleLogin}>
              உள்நுழை / Login
            </Button>
          </VStack>
        </Box>
      </Box>
    );
  }

  // ── Admin Dashboard ──
  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="1100px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox}>
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Text fontSize="2xl">🌳</Text>
              <Box>
                <Heading fontSize={{ base: 'lg', md: 'xl' }} color="white">
                  frootze Admin Panel
                </Heading>
                <Text fontSize="xs" color="whiteAlpha.400">frootze.com</Text>
              </Box>
            </HStack>
            <Button size="sm" variant="ghost" color="red.400"
              onClick={handleLogout} _hover={{ color: 'red.300', bg: 'red.900' }}>
              வெளியேறு / Logout
            </Button>
          </HStack>
        </Box>

        {/* Tab Navigation */}
        <HStack bg="whiteAlpha.100" borderRadius="xl" p={1}>
          {[
            { key: 'stats',   label: '📊 Stats'          },
            { key: 'kuthams', label: '🏷️ Kuthams'        },
            { key: 'users',   label: '👥 Users'           },
          ].map(t => (
            <Button key={t.key} flex={1} size="sm"
              bg={activeTab === t.key ? 'purple.600' : 'transparent'}
              color={activeTab === t.key ? 'white' : 'whiteAlpha.600'}
              borderRadius="lg"
              onClick={() => {
                setActiveTab(t.key);
                if (t.key === 'users') loadUsers();
                if (t.key === 'stats') loadStats();
              }}
              _hover={{ bg: activeTab === t.key ? 'purple.600' : 'whiteAlpha.100' }}>
              {t.label}
            </Button>
          ))}
        </HStack>

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <Box>
            {!stats ? (
              <Box textAlign="center" py={10}><Spinner color="purple.300" /></Box>
            ) : (
              <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
                {[
                  { label: 'Total Users',        value: stats.total_users,                  icon: '👥', color: 'purple.300' },
                  { label: 'New Today',           value: stats.new_users_today,              icon: '🆕', color: 'green.300'  },
                  { label: 'Verified Relations',  value: stats.total_verified_relationships, icon: '✅', color: 'blue.300'   },
                  { label: 'Pending Relations',   value: stats.pending_relationships,        icon: '⏳', color: 'yellow.300' },
                  { label: 'Total Kuthams',       value: stats.total_kuthams,                icon: '🏷️', color: 'pink.300'   },
                ].map((s, i) => (
                  <Box key={i} bg="whiteAlpha.100" border="1px solid"
                    borderColor="whiteAlpha.200" borderRadius="2xl" px={5} py={5}>
                    <Text fontSize="2xl">{s.icon}</Text>
                    <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800"
                      color={s.color} mt={2}>{s.value}</Text>
                    <Text fontSize="xs" color="whiteAlpha.500" mt={1}>{s.label}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </Box>
        )}

        {/* KUTHAMS TAB */}
        {activeTab === 'kuthams' && (
          <VStack spacing={4} align="stretch">

            {/* Add new kutham */}
            <Box {...sectionBox}>
              <Text fontSize="md" fontWeight="700" color="white" mb={4}>
                ➕ புதிய குலம் சேர் / Add New Kutham
              </Text>
              <HStack spacing={3}>
                <Input flex={1} placeholder="குலப்பெயர் / Kutham name"
                  value={newKutham} onChange={e => setNewKutham(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddKutham()}
                  {...inputStyle} />
                <Button h="50px" px={6} bgGradient="linear(to-r, purple.600, green.500)"
                  color="white" fontWeight="700" borderRadius="xl"
                  isLoading={kuthamLoading} onClick={handleAddKutham}>
                  சேர் / Add
                </Button>
              </HStack>
              {kuthamError && (
                <Box bg="red.900" border="1px solid" borderColor="red.500"
                  borderRadius="xl" px={4} py={2} mt={3}>
                  <Text color="red.200" fontSize="sm">{kuthamError}</Text>
                </Box>
              )}
              {kuthamSuccess && (
                <Box bg="green.900" border="1px solid" borderColor="green.500"
                  borderRadius="xl" px={4} py={2} mt={3}>
                  <Text color="green.200" fontSize="sm">{kuthamSuccess}</Text>
                </Box>
              )}
            </Box>

            {/* Kutham list */}
            <Box {...sectionBox}>
              <Text fontSize="md" fontWeight="700" color="white" mb={4}>
                🏷️ அங்கீகரிக்கப்பட்ட குலங்கள் / Approved Kuthams ({kuthams.length})
              </Text>
              <VStack spacing={2} align="stretch">
                {kuthams.length === 0 && (
                  <Text color="whiteAlpha.400" textAlign="center" py={4}>
                    No kuthams added yet
                  </Text>
                )}
                {kuthams.map(k => (
                  <HStack key={k.id} bg="whiteAlpha.100" borderRadius="xl"
                    px={4} py={3} justify="space-between">
                    <HStack spacing={3}>
                      <Text fontSize="lg">🏷️</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="600" color="white">{k.name}</Text>
                        <Text fontSize="xs" color="whiteAlpha.400">
                          {k.user_count} பயனர் / users
                        </Text>
                      </Box>
                    </HStack>
                    <Button size="sm" variant="ghost" color="red.400"
                      onClick={() => handleDeleteKutham(k.id, k.name)}
                      _hover={{ color: 'red.300', bg: 'red.900' }}>
                      🗑️
                    </Button>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <VStack spacing={4} align="stretch">

            {/* Search */}
            <Box {...sectionBox}>
              <HStack spacing={3}>
                <Input flex={1} placeholder="🔍 பெயர் அல்லது தொலைபேசி / Search name or phone"
                  value={search}
                  onChange={e => { setSearch(e.target.value); loadUsers(e.target.value); }}
                  {...inputStyle} />
                <Button h="50px" px={6} bg="whiteAlpha.200" color="white"
                  borderRadius="xl" onClick={() => loadUsers(search)}>
                  தேடு
                </Button>
              </HStack>
            </Box>

            {/* User list */}
            <Box {...sectionBox}>
              <Text fontSize="md" fontWeight="700" color="white" mb={4}>
                👥 பயனர்கள் / Users ({users.length})
              </Text>
              {loading ? (
                <Box textAlign="center" py={6}><Spinner color="purple.300" /></Box>
              ) : (
                <VStack spacing={2} align="stretch">
                  {users.length === 0 && (
                    <Text color="whiteAlpha.400" textAlign="center" py={4}>
                      No users found
                    </Text>
                  )}
                  {users.map(u => (
                    <HStack key={u.id} bg="whiteAlpha.100" borderRadius="xl"
                      px={4} py={3} justify="space-between" flexWrap="wrap" gap={2}>
                      <HStack spacing={3}>
                        <Avatar size="sm" name={u.name} />
                        <Box>
                          <Text fontSize="sm" fontWeight="600" color="white">{u.name}</Text>
                          <Text fontSize="xs" color="whiteAlpha.500">{u.phone}</Text>
                        </Box>
                      </HStack>
                      <HStack spacing={2} flexWrap="wrap">
                        {u.kutham && (
                          <Badge colorScheme="purple" borderRadius="full" px={2} fontSize="xs">
                            {u.kutham}
                          </Badge>
                        )}
                        {!u.kutham && (
                          <Badge colorScheme="gray" borderRadius="full" px={2} fontSize="xs">
                            No Kutham
                          </Badge>
                        )}
                        {u.district && (
                          <Badge colorScheme="blue" borderRadius="full" px={2} fontSize="xs">
                            {u.district}
                          </Badge>
                        )}
                        <Text fontSize="xs" color="whiteAlpha.300">
                          {new Date(u.created_at).toLocaleDateString('en-IN')}
                        </Text>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
              )}
            </Box>
          </VStack>
        )}

      </VStack>
    </Box>
  );
}
