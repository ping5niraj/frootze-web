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

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function Admin() {
  const [token, setToken]               = useState(() => localStorage.getItem('pmf_admin_token') || '');
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [loginError, setLoginError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab]           = useState('stats');
  const [stats, setStats]                   = useState(null);
  const [kuthams, setKuthams]               = useState([]);
  const [users, setUsers]                   = useState([]);
  const [pendingRels, setPendingRels]       = useState([]);
  const [under18, setUnder18]               = useState([]);
  const [offlineNodes, setOfflineNodes]     = useState([]);
  const [search, setSearch]                 = useState('');
  const [newKutham, setNewKutham]           = useState('');
  const [kuthamLoading, setKuthamLoading]   = useState(false);
  const [kuthamError, setKuthamError]       = useState('');
  const [kuthamSuccess, setKuthamSuccess]   = useState('');
  const [loading, setLoading]               = useState(false);

  const isLoggedIn = !!token;

  useEffect(() => { if (isLoggedIn) { loadStats(); loadKuthams(); } }, [token]);

  const handleLogin = async () => {
    setLoginLoading(true); setLoginError('');
    try {
      const res = await axios.post(`${BASE_URL}/api/admin/login`, { username, password });
      setToken(res.data.token);
      localStorage.setItem('pmf_admin_token', res.data.token);
    } catch (e) { setLoginError(e.response?.data?.error || 'Login failed'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => { setToken(''); localStorage.removeItem('pmf_admin_token'); };

  const loadStats       = async () => { try { const r = await api(token).get('/api/admin/stats');           setStats(r.data.stats);          } catch(e) { if(e.response?.status===401) handleLogout(); } };
  const loadKuthams     = async () => { try { const r = await api(token).get('/api/admin/kuthams');         setKuthams(r.data.kuthams||[]);  } catch(e) {} };
  const loadPendingRels = async () => { try { setLoading(true); const r = await api(token).get('/api/admin/pending-relations'); setPendingRels(r.data.pending||[]); } catch(e) {} finally { setLoading(false); } };
  const loadUnder18     = async () => { try { setLoading(true); const r = await api(token).get('/api/admin/under18');           setUnder18(r.data.users||[]);       } catch(e) {} finally { setLoading(false); } };
  const loadOffline     = async () => { try { setLoading(true); const r = await api(token).get('/api/admin/offline-nodes');     setOfflineNodes(r.data.nodes||[]);  } catch(e) {} finally { setLoading(false); } };
  const loadUsers       = async (q='') => { try { setLoading(true); const r = await api(token).get(`/api/admin/users${q?`?search=${q}`:''}`); setUsers(r.data.users||[]); } catch(e) {} finally { setLoading(false); } };

  const handleAddKutham = async () => {
    if (!newKutham.trim()) return;
    setKuthamLoading(true); setKuthamError(''); setKuthamSuccess('');
    try {
      await api(token).post('/api/admin/kuthams', { name: newKutham.trim() });
      setKuthamSuccess(`✅ "${newKutham.trim()}" சேர்க்கப்பட்டது`);
      setNewKutham(''); loadKuthams();
    } catch(e) { setKuthamError(e.response?.data?.error || 'Failed'); }
    finally { setKuthamLoading(false); }
  };

  const handleDeleteKutham = async (id, name) => {
    if (!window.confirm(`"${name}" நீக்கவுமா?`)) return;
    try { await api(token).delete(`/api/admin/kuthams/${id}`); loadKuthams(); } catch(e) {}
  };

  const switchTab = (key) => {
    setActiveTab(key);
    if (key === 'stats')   loadStats();
    if (key === 'users')   loadUsers();
    if (key === 'pending') loadPendingRels();
    if (key === 'under18') loadUnder18();
    if (key === 'offline') loadOffline();
  };

  // ── Login ──
  if (!isLoggedIn) return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      display="flex" alignItems="center" justifyContent="center" px={4}>
      <Box w="100%" maxW="400px" bg="whiteAlpha.100" border="1px solid"
        borderColor="whiteAlpha.200" borderRadius="2xl" px={8} py={10}>
        <VStack spacing={6}>
          <Text fontSize="3xl">🔐</Text>
          <Heading fontSize="2xl" color="white">Admin Login</Heading>
          <Text color="whiteAlpha.500" fontSize="sm">frootze.com Admin Panel</Text>
          <Input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} {...inputStyle}/>
          <Input placeholder="Password" type="password" value={password}
            onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} {...inputStyle}/>
          {loginError && <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3} w="100%">
            <Text color="red.200" fontSize="sm">{loginError}</Text></Box>}
          <Button w="100%" h="50px" bgGradient="linear(to-r, purple.600, green.500)"
            color="white" fontSize="lg" fontWeight="700" borderRadius="xl"
            isLoading={loginLoading} onClick={handleLogin}>உள்நுழை / Login</Button>
        </VStack>
      </Box>
    </Box>
  );

  const TABS = [
    { key: 'stats',   label: '📊 Stats'    },
    { key: 'pending', label: '⏳ Pending'   },
    { key: 'under18', label: '👶 Under 18'  },
    { key: 'offline', label: '🕊️ Offline'   },
    { key: 'kuthams', label: '🏷️ Kuthams'  },
    { key: 'users',   label: '👥 Users'     },
  ];

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="1100px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox}>
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Text fontSize="2xl">🌳</Text>
              <Box>
                <Heading fontSize={{ base: 'lg', md: 'xl' }} color="white">frootze Admin Panel</Heading>
                <Text fontSize="xs" color="whiteAlpha.400">frootze.com</Text>
              </Box>
            </HStack>
            <Button size="sm" variant="ghost" color="red.400" onClick={handleLogout}
              _hover={{ color: 'red.300', bg: 'red.900' }}>வெளியேறு / Logout</Button>
          </HStack>
        </Box>

        {/* Tabs */}
        <HStack bg="whiteAlpha.100" borderRadius="xl" p={1} flexWrap="wrap" gap={1}>
          {TABS.map(t => (
            <Button key={t.key} flex={1} size="sm" minW="80px"
              bg={activeTab === t.key ? 'purple.600' : 'transparent'}
              color={activeTab === t.key ? 'white' : 'whiteAlpha.600'}
              borderRadius="lg" onClick={() => switchTab(t.key)}
              _hover={{ bg: activeTab === t.key ? 'purple.600' : 'whiteAlpha.100' }}>
              {t.label}
            </Button>
          ))}
        </HStack>

        {/* ── STATS ── */}
        {activeTab === 'stats' && (
          !stats ? <Box textAlign="center" py={10}><Spinner color="purple.300"/></Box> :
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            {[
              { label: 'Total Users',       value: stats.total_users,                  icon: '👥', color: 'purple.300', tab: null       },
              { label: 'New Today',          value: stats.new_users_today,              icon: '🆕', color: 'green.300',  tab: null       },
              { label: 'Verified Relations', value: stats.total_verified_relationships, icon: '✅', color: 'blue.300',   tab: null       },
              { label: 'Pending Relations',  value: stats.pending_relationships,        icon: '⏳', color: 'yellow.300', tab: 'pending'  },
              { label: 'Under 18',           value: stats.under_18_users,               icon: '👶', color: 'cyan.300',   tab: 'under18'  },
              { label: 'Offline / Deceased', value: stats.offline_nodes,                icon: '🕊️', color: 'gray.300',   tab: 'offline'  },
              { label: 'Total Kuthams',      value: stats.total_kuthams,                icon: '🏷️', color: 'pink.300',   tab: 'kuthams'  },
            ].map((s, i) => (
              <Box key={i} bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                borderRadius="2xl" px={5} py={5}
                cursor={s.tab ? 'pointer' : 'default'}
                onClick={() => s.tab && switchTab(s.tab)}
                _hover={s.tab ? { borderColor: s.color } : {}}>
                <Text fontSize="2xl">{s.icon}</Text>
                <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" color={s.color} mt={2}>{s.value}</Text>
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>{s.label}</Text>
                {s.tab && s.value > 0 && <Text fontSize="2xs" color={s.color} mt={1}>👆 Click to view</Text>}
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* ── PENDING ── */}
        {activeTab === 'pending' && (
          <Box {...sectionBox}>
            <HStack justify="space-between" mb={4}>
              <Text fontSize="md" fontWeight="700" color="white">⏳ Pending Relations ({pendingRels.length})</Text>
              <Button size="sm" variant="ghost" color="whiteAlpha.500" onClick={loadPendingRels}>🔄</Button>
            </HStack>
            {loading ? <Box textAlign="center" py={6}><Spinner color="yellow.300"/></Box>
            : pendingRels.length === 0
              ? <Box textAlign="center" py={8}><Text fontSize="3xl">✅</Text><Text color="whiteAlpha.500" mt={2}>No pending relations</Text></Box>
              : <VStack spacing={3} align="stretch">
                  {pendingRels.map(r => (
                    <Box key={r.id} bg="whiteAlpha.100" border="1px solid" borderColor="yellow.800" borderRadius="xl" px={4} py={4}>
                      <HStack spacing={4} flexWrap="wrap" gap={3}>
                        <HStack spacing={2} minW="130px">
                          <Avatar size="sm" name={r.from_user?.name||'?'} bg="purple.600"/>
                          <Box><Text fontSize="sm" fontWeight="700" color="white">{r.from_user?.name||'Unknown'}</Text>
                            <Text fontSize="xs" color="whiteAlpha.400">{r.from_user?.phone}</Text></Box>
                        </HStack>
                        <VStack spacing={0} flex={1} align="center">
                          <Text fontSize="xs" color="yellow.300" fontWeight="700">{r.relation_tamil||r.relation_type}</Text>
                          <Text fontSize="lg" color="yellow.400">→</Text>
                        </VStack>
                        <HStack spacing={2} minW="130px" justify="flex-end">
                          {r.is_offline
                            ? <Box textAlign="right"><Text fontSize="sm" fontWeight="700" color="whiteAlpha.700">{r.offline_name}</Text>
                                <Badge colorScheme="gray" fontSize="2xs">Offline</Badge></Box>
                            : <><Box textAlign="right"><Text fontSize="sm" fontWeight="700" color="white">{r.to_user?.name||'Unknown'}</Text>
                                <Text fontSize="xs" color="whiteAlpha.400">{r.to_user?.phone}</Text></Box>
                              <Avatar size="sm" name={r.to_user?.name||'?'} bg="green.600"/></>}
                        </HStack>
                      </HStack>
                      <Text fontSize="2xs" color="whiteAlpha.300" mt={2} textAlign="right">
                        {new Date(r.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                      </Text>
                    </Box>
                  ))}
                </VStack>}
          </Box>
        )}

        {/* ── UNDER 18 ── */}
        {activeTab === 'under18' && (
          <Box {...sectionBox}>
            <HStack justify="space-between" mb={4}>
              <Text fontSize="md" fontWeight="700" color="white">👶 Under 18 Members ({under18.length})</Text>
              <Button size="sm" variant="ghost" color="whiteAlpha.500" onClick={loadUnder18}>🔄</Button>
            </HStack>
            {loading ? <Box textAlign="center" py={6}><Spinner color="cyan.300"/></Box>
            : under18.length === 0
              ? <Box textAlign="center" py={8}><Text fontSize="3xl">👶</Text>
                  <Text color="whiteAlpha.500" mt={2}>No under-18 members found</Text>
                  <Text color="whiteAlpha.300" fontSize="xs" mt={1}>Only members with date of birth filled in are counted</Text></Box>
              : <VStack spacing={2} align="stretch">
                  {under18.map(u => (
                    <HStack key={u.id} bg="whiteAlpha.100" borderRadius="xl" px={4} py={3}
                      justify="space-between" flexWrap="wrap" gap={2}>
                      <HStack spacing={3}>
                        <Avatar size="sm" name={u.name} bg="cyan.700"/>
                        <Box>
                          <Text fontSize="sm" fontWeight="600" color="white">{u.name}</Text>
                          <Text fontSize="xs" color="whiteAlpha.500">{u.phone}</Text>
                        </Box>
                      </HStack>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge colorScheme="cyan" borderRadius="full" px={2} fontSize="xs">
                          Age: {calcAge(u.date_of_birth)}
                        </Badge>
                        {u.kutham
                          ? <Badge colorScheme="purple" borderRadius="full" px={2} fontSize="xs">{u.kutham}</Badge>
                          : <Badge colorScheme="gray"   borderRadius="full" px={2} fontSize="xs">No Kutham</Badge>}
                        <Text fontSize="xs" color="whiteAlpha.300">
                          DOB: {u.date_of_birth ? new Date(u.date_of_birth).toLocaleDateString('en-IN') : '—'}
                        </Text>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>}
          </Box>
        )}

        {/* ── OFFLINE / DECEASED ── */}
        {activeTab === 'offline' && (
          <Box {...sectionBox}>
            <HStack justify="space-between" mb={4}>
              <Text fontSize="md" fontWeight="700" color="white">🕊️ Offline / Deceased Members ({offlineNodes.length})</Text>
              <Button size="sm" variant="ghost" color="whiteAlpha.500" onClick={loadOffline}>🔄</Button>
            </HStack>
            {loading ? <Box textAlign="center" py={6}><Spinner color="gray.300"/></Box>
            : offlineNodes.length === 0
              ? <Box textAlign="center" py={8}><Text fontSize="3xl">🕊️</Text>
                  <Text color="whiteAlpha.500" mt={2}>No offline members added yet</Text></Box>
              : <VStack spacing={2} align="stretch">
                  {offlineNodes.map(n => (
                    <HStack key={n.id} bg="whiteAlpha.100" borderRadius="xl" px={4} py={3}
                      justify="space-between" flexWrap="wrap" gap={2}>
                      <HStack spacing={3}>
                        <Text fontSize="2xl">🕊️</Text>
                        <Box>
                          <Text fontSize="sm" fontWeight="600" color="whiteAlpha.800">{n.offline_name}</Text>
                          <Text fontSize="xs" color="whiteAlpha.400">
                            {n.relation_tamil || n.relation_type} • {n.offline_gender || 'unknown gender'}
                          </Text>
                        </Box>
                      </HStack>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge colorScheme="gray" borderRadius="full" px={2} fontSize="xs">Offline</Badge>
                        <Box textAlign="right">
                          <Text fontSize="xs" color="whiteAlpha.400">Added by</Text>
                          <Text fontSize="xs" color="whiteAlpha.600" fontWeight="600">{n.added_by?.name || '—'}</Text>
                        </Box>
                        <Text fontSize="xs" color="whiteAlpha.300">
                          {new Date(n.created_at).toLocaleDateString('en-IN')}
                        </Text>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>}
          </Box>
        )}

        {/* ── KUTHAMS ── */}
        {activeTab === 'kuthams' && (
          <VStack spacing={4} align="stretch">
            <Box {...sectionBox}>
              <Text fontSize="md" fontWeight="700" color="white" mb={4}>➕ Add New Kutham</Text>
              <HStack spacing={3}>
                <Input flex={1} placeholder="குலப்பெயர் / Kutham name" value={newKutham}
                  onChange={e=>setNewKutham(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddKutham()} {...inputStyle}/>
                <Button h="50px" px={6} bgGradient="linear(to-r, purple.600, green.500)"
                  color="white" fontWeight="700" borderRadius="xl" isLoading={kuthamLoading} onClick={handleAddKutham}>சேர்</Button>
              </HStack>
              {kuthamError   && <Box bg="red.900"   border="1px solid" borderColor="red.500"   borderRadius="xl" px={4} py={2} mt={3}><Text color="red.200"   fontSize="sm">{kuthamError}</Text></Box>}
              {kuthamSuccess && <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={2} mt={3}><Text color="green.200" fontSize="sm">{kuthamSuccess}</Text></Box>}
            </Box>
            <Box {...sectionBox}>
              <Text fontSize="md" fontWeight="700" color="white" mb={4}>🏷️ Kuthams ({kuthams.length})</Text>
              <VStack spacing={2} align="stretch">
                {kuthams.length === 0 && <Text color="whiteAlpha.400" textAlign="center" py={4}>No kuthams added yet</Text>}
                {kuthams.map(k => (
                  <HStack key={k.id} bg="whiteAlpha.100" borderRadius="xl" px={4} py={3} justify="space-between">
                    <HStack spacing={3}>
                      <Text fontSize="lg">🏷️</Text>
                      <Box><Text fontSize="sm" fontWeight="600" color="white">{k.name}</Text>
                        <Text fontSize="xs" color="whiteAlpha.400">{k.user_count} users</Text></Box>
                    </HStack>
                    <Button size="sm" variant="ghost" color="red.400" onClick={()=>handleDeleteKutham(k.id,k.name)}
                      _hover={{ color:'red.300', bg:'red.900' }}>🗑️</Button>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <VStack spacing={4} align="stretch">
            <Box {...sectionBox}>
              <HStack spacing={3}>
                <Input flex={1} placeholder="🔍 Search name or phone" value={search}
                  onChange={e=>{setSearch(e.target.value);loadUsers(e.target.value);}} {...inputStyle}/>
                <Button h="50px" px={6} bg="whiteAlpha.200" color="white" borderRadius="xl"
                  onClick={()=>loadUsers(search)}>தேடு</Button>
              </HStack>
            </Box>
            <Box {...sectionBox}>
              <Text fontSize="md" fontWeight="700" color="white" mb={4}>👥 Users ({users.length})</Text>
              {loading ? <Box textAlign="center" py={6}><Spinner color="purple.300"/></Box>
              : <VStack spacing={2} align="stretch">
                  {users.length===0 && <Text color="whiteAlpha.400" textAlign="center" py={4}>No users found</Text>}
                  {users.map(u => (
                    <HStack key={u.id} bg="whiteAlpha.100" borderRadius="xl" px={4} py={3}
                      justify="space-between" flexWrap="wrap" gap={2}>
                      <HStack spacing={3}>
                        <Avatar size="sm" name={u.name}/>
                        <Box><Text fontSize="sm" fontWeight="600" color="white">{u.name}</Text>
                          <Text fontSize="xs" color="whiteAlpha.500">{u.phone}</Text></Box>
                      </HStack>
                      <HStack spacing={2} flexWrap="wrap">
                        {u.kutham
                          ? <Badge colorScheme="purple" borderRadius="full" px={2} fontSize="xs">{u.kutham}</Badge>
                          : <Badge colorScheme="gray"   borderRadius="full" px={2} fontSize="xs">No Kutham</Badge>}
                        {u.district && <Badge colorScheme="blue" borderRadius="full" px={2} fontSize="xs">{u.district}</Badge>}
                        {u.date_of_birth && calcAge(u.date_of_birth) < 18 &&
                          <Badge colorScheme="cyan" borderRadius="full" px={2} fontSize="xs">Under 18</Badge>}
                        <Text fontSize="xs" color="whiteAlpha.300">
                          {new Date(u.created_at).toLocaleDateString('en-IN')}
                        </Text>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>}
            </Box>
          </VStack>
        )}

      </VStack>
    </Box>
  );
}
