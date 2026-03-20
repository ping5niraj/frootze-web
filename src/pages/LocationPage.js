import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button,
  Avatar, Badge, SimpleGrid, Spinner
} from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS;

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid',
  borderColor: 'whiteAlpha.200', borderRadius: '2xl',
  px: { base: 5, md: 8 },
};

export default function LocationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myLocation, setMyLocation] = useState(null);
  const [sharedWith, setSharedWith] = useState([]);
  const [familyLocations, setFamilyLocations] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); loadGoogleMaps(); }, []);

  const loadData = async () => {
    try {
      const [mineRes, familyRes, membersRes] = await Promise.all([
        api.get('/api/locations/mine'),
        api.get('/api/locations/family'),
        api.get('/api/messages/family-members'),
      ]);
      setMyLocation(mineRes.data.location);
      setSharedWith(mineRes.data.shared_with || []);
      setSelectedIds(mineRes.data.shared_with?.map(u => u.id) || []);
      setFamilyLocations(familyRes.data.locations || []);
      setFamilyMembers(membersRes.data.members || []);
    } catch (e) { console.error('Load failed:', e.message); }
    finally { setLoading(false); }
  };

  const loadGoogleMaps = () => {
    if (window.google) { setMapLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
    script.async = true; script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  };

  const initMap = useCallback((locations) => {
    if (!mapLoaded || !window.google) return;
    const mapDiv = document.getElementById('family-map');
    if (!mapDiv || locations.length === 0) return;
    const center = { lat: parseFloat(locations[0].latitude), lng: parseFloat(locations[0].longitude) };
    const map = new window.google.maps.Map(mapDiv, { zoom: locations.length > 1 ? 8 : 12, center, mapTypeControl: false, streetViewControl: false });
    const bounds = new window.google.maps.LatLngBounds();
    locations.forEach(loc => {
      const position = { lat: parseFloat(loc.latitude), lng: parseFloat(loc.longitude) };
      const marker = new window.google.maps.Marker({ position, map, title: loc.user?.name });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="padding:8px"><b>${loc.user?.name}</b>${loc.address ? `<br><small>${loc.address}</small>` : ''}</div>`
      });
      marker.addListener('click', () => infoWindow.open(map, marker));
      bounds.extend(position);
    });
    if (locations.length > 1) map.fitBounds(bounds);
  }, [mapLoaded]);

  useEffect(() => {
    if (mapLoaded && familyLocations.length > 0) setTimeout(() => initMap(familyLocations), 300);
  }, [mapLoaded, familyLocations, initMap]);

  const handleGetLocation = () => {
    setError('');
    if (!navigator.geolocation) { setError('Location not supported'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = '';
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          address = await new Promise(resolve => {
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
              resolve(status === 'OK' ? results[0]?.formatted_address : '');
            });
          });
        }
        setPendingCoords({ latitude, longitude, address });
        setGettingLocation(false);
        setShowShareModal(true);
      },
      () => { setGettingLocation(false); setError('Location permission denied'); }
    );
  };

  const handleConfirmShare = async () => {
    if (selectedIds.length === 0) { setError('குறைந்தது ஒருவரை தேர்வு செய்யவும்'); return; }
    setSharing(true);
    try {
      await api.post('/api/locations/share', { ...pendingCoords, to_user_ids: selectedIds });
      setSuccess(`${selectedIds.length} பேருக்கு இடம் பகிரப்பட்டது!`);
      setShowShareModal(false); setPendingCoords(null);
      await loadData();
    } catch (e) { setError('Failed to share location'); }
    finally { setSharing(false); }
  };

  const handleHide = async () => {
    setHiding(true);
    try {
      await api.delete('/api/locations/hide');
      setMyLocation(null); setSharedWith([]); setSelectedIds([]);
      setSuccess('இடம் மறைக்கப்பட்டது');
      await loadData();
    } catch (e) { setError('Failed to hide'); }
    finally { setHiding(false); }
  };

  const handleUpdatePermissions = async () => {
    try {
      await api.put('/api/locations/permissions', { to_user_ids: selectedIds });
      setSuccess('அனுமதிகள் புதுப்பிக்கப்பட்டன');
      await loadData();
    } catch (e) { setError('Failed to update'); }
  };

  const toggleMember = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openMaps = (lat, lng, name) => window.open(`https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(name)}`, '_blank');

  if (loading) return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" display="flex" alignItems="center" justifyContent="center">
      <VStack><Text fontSize="3xl">📍</Text><Spinner color="purple.300" /><Text color="whiteAlpha.600">ஏற்றுகிறோம்...</Text></VStack>
    </Box>
  );

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6} pb={24}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Section 1 — Header */}
        <Box {...sectionBox} py={5}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">📍 குடும்ப இடங்கள்</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Family Locations</Text>
            </Box>
          </HStack>
        </Box>

        {/* Section 2 — My Location */}
        <Box {...sectionBox} py={{ base: 5, md: 6 }}>
          <VStack spacing={4} align="stretch">
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white">
              என் இடம் / My Location
            </Text>

            {myLocation?.is_active ? (
              <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={4}>
                <HStack justify="space-between" mb={2}>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="700" color="green.300">✅ இடம் பகிரப்படுகிறது</Text>
                    {myLocation.address && <Text fontSize="xs" color="green.400">📍 {myLocation.address}</Text>}
                    <Text fontSize="xs" color="green.600">{new Date(myLocation.shared_at).toLocaleString('ta-IN')}</Text>
                  </VStack>
                  <Button size="sm" colorScheme="blue" borderRadius="xl"
                    onClick={() => openMaps(myLocation.latitude, myLocation.longitude, 'My Location')}>
                    🗺️ Maps
                  </Button>
                </HStack>

                {/* Who can see */}
                {sharedWith.length > 0 && (
                  <Box mb={3}>
                    <Text fontSize="xs" color="green.400" fontWeight="600" mb={1}>👁️ இவர்களுக்கு தெரியும்:</Text>
                    <HStack flexWrap="wrap" gap={1}>
                      {sharedWith.map(u => (
                        <Badge key={u.id} colorScheme="green" borderRadius="full" px={2} fontSize="xs">{u.name}</Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                {/* Update permissions */}
                <VStack spacing={2} align="stretch">
                  <Text fontSize="xs" color="whiteAlpha.600" fontWeight="600">யாருக்கு தெரிய வேண்டும்?</Text>
                  <Box maxH="140px" overflowY="auto">
                    <VStack spacing={1} align="stretch">
                      {familyMembers.map(m => (
                        <HStack key={m.id} cursor="pointer"
                          bg={selectedIds.includes(m.id) ? 'green.800' : 'whiteAlpha.100'}
                          border="1px solid" borderColor={selectedIds.includes(m.id) ? 'green.500' : 'whiteAlpha.200'}
                          borderRadius="lg" px={3} py={2}
                          onClick={() => toggleMember(m.id)} transition="all 0.2s">
                          <Avatar size="xs" name={m.name} src={m.profile_photo} />
                          <Text fontSize="sm" color="white" flex={1}>{m.name}</Text>
                          <Text color={selectedIds.includes(m.id) ? 'green.300' : 'whiteAlpha.300'} fontSize="sm">
                            {selectedIds.includes(m.id) ? '✓' : '○'}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                  <Button size="sm" colorScheme="green" borderRadius="xl" onClick={handleUpdatePermissions}>
                    அனுமதிகள் புதுப்பி / Update
                  </Button>
                </VStack>
              </Box>
            ) : (
              <Box bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200" borderRadius="xl" px={4} py={3}>
                <Text color="whiteAlpha.500" fontSize="sm">📍 இடம் பகிரவில்லை / Location not shared</Text>
              </Box>
            )}

            <HStack spacing={3}>
              <Button flex={1} h={{ base: '50px', md: '56px' }}
                bgGradient="linear(to-r, purple.600, green.500)"
                color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={gettingLocation} loadingText="இடம் பெறுகிறோம்..."
                onClick={handleGetLocation}
                _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}>
                📍 இடத்தை பகிர் / Share Location
              </Button>
              {myLocation?.is_active && (
                <Button h={{ base: '50px', md: '56px' }} px={5}
                  variant="outline" borderColor="red.500" color="red.300"
                  borderRadius="xl" isLoading={hiding}
                  onClick={handleHide}
                  _hover={{ bg: 'red.900' }}>
                  🙈 Hide
                </Button>
              )}
            </HStack>

            {error && <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}><Text color="red.200" fontSize="sm">{error}</Text></Box>}
            {success && <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}><Text color="green.200" fontSize="sm">{success}</Text></Box>}
          </VStack>
        </Box>

        {/* Section 3 — Google Map */}
        {familyLocations.length > 0 && (
          <Box {...sectionBox} p={0} overflow="hidden">
            <Box px={{ base: 5, md: 8 }} py={4} borderBottom="1px solid" borderColor="whiteAlpha.200">
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white">
                🗺️ குடும்ப வரைபடம் / Family Map
              </Text>
              <Text fontSize="xs" color="whiteAlpha.500">{familyLocations.length} members sharing location</Text>
            </Box>
            <Box id="family-map" h="280px" w="100%" bg="whiteAlpha.100">
              {!mapLoaded && (
                <Box display="flex" alignItems="center" justifyContent="center" h="100%">
                  <Spinner color="purple.300" />
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Section 4 — Family Locations List */}
        <Box {...sectionBox} py={{ base: 4, md: 5 }}>
          <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white" mb={4}>
            குடும்பத்தினர் இடங்கள் / Family Locations
          </Text>
          {familyLocations.length === 0 ? (
            <VStack py={8} spacing={2}>
              <Text fontSize="3xl">🗺️</Text>
              <Text color="whiteAlpha.500" textAlign="center">யாரும் இடம் பகிரவில்லை</Text>
              <Text color="whiteAlpha.400" fontSize="sm" textAlign="center">No family members sharing location yet</Text>
            </VStack>
          ) : (
            <VStack spacing={3} align="stretch">
              {familyLocations.map(loc => (
                <HStack key={loc.id} bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
                  borderRadius="xl" px={4} py={3} justify="space-between">
                  <HStack spacing={3}>
                    <Avatar size="md" name={loc.user?.name} src={loc.user?.profile_photo}
                      border="2px solid" borderColor="purple.400" />
                    <Box>
                      <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" color="white">{loc.user?.name}</Text>
                      {loc.address && <Text fontSize="xs" color="whiteAlpha.500" noOfLines={1}>📍 {loc.address}</Text>}
                      <Text fontSize="xs" color="whiteAlpha.400">
                        {new Date(loc.shared_at).toLocaleString('ta-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Box>
                  </HStack>
                  <Button size="sm" colorScheme="blue" borderRadius="xl"
                    onClick={() => openMaps(loc.latitude, loc.longitude, loc.user?.name)}>
                    🗺️ Maps
                  </Button>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

      </VStack>

      {/* Share Modal */}
      {showShareModal && pendingCoords && (
        <Box position="fixed" inset={0} bg="blackAlpha.800" display="flex" alignItems="flex-end" justifyContent="center" zIndex={100}>
          <Box bg="#1e1b4b" border="1px solid" borderColor="whiteAlpha.200"
            borderTopRadius="2xl" w="100%" maxW="900px" maxH="80vh" overflowY="auto" pb={8}>

            <Box px={{ base: 5, md: 8 }} py={4} borderBottom="1px solid" borderColor="whiteAlpha.200">
              <HStack justify="space-between">
                <Box>
                  <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white">📍 யாருக்கு பகிர?</Text>
                  <Text fontSize="xs" color="whiteAlpha.500">Who can see your location?</Text>
                </Box>
                <Button size="sm" variant="ghost" color="whiteAlpha.600"
                  onClick={() => { setShowShareModal(false); setPendingCoords(null); }}
                  _hover={{ color: 'white' }}>✕</Button>
              </HStack>
            </Box>

            <Box px={{ base: 5, md: 8 }} py={4}>
              {pendingCoords.address && (
                <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3} mb={4}>
                  <Text fontSize="xs" color="green.400" fontWeight="600">📍 உங்கள் இடம்:</Text>
                  <Text fontSize="sm" color="green.200" mt={1}>{pendingCoords.address}</Text>
                </Box>
              )}

              <HStack justify="space-between" mb={3}>
                <Text fontSize="sm" fontWeight="600" color="whiteAlpha.700">தேர்வு செய்யவும்:</Text>
                <Text fontSize="xs" color="purple.300" cursor="pointer"
                  onClick={() => setSelectedIds(familyMembers.map(m => m.id))}>
                  அனைவரும் / All
                </Text>
              </HStack>

              <VStack spacing={2} align="stretch" mb={4}>
                {familyMembers.length === 0 ? (
                  <Text color="whiteAlpha.400" fontSize="sm" textAlign="center" py={4}>
                    சரிபார்க்கப்பட்ட குடும்பத்தினர் இல்லை
                  </Text>
                ) : familyMembers.map(m => (
                  <HStack key={m.id} cursor="pointer"
                    bg={selectedIds.includes(m.id) ? 'purple.800' : 'whiteAlpha.100'}
                    border="1px solid" borderColor={selectedIds.includes(m.id) ? 'purple.400' : 'whiteAlpha.200'}
                    borderRadius="xl" px={4} py={3}
                    onClick={() => toggleMember(m.id)} transition="all 0.2s">
                    <Avatar size="sm" name={m.name} src={m.profile_photo} />
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="600" color="white">{m.name}</Text>
                      <Text fontSize="xs" color="whiteAlpha.400">{m.relation_tamil}</Text>
                    </Box>
                    <Text fontSize="xl" color={selectedIds.includes(m.id) ? 'purple.300' : 'whiteAlpha.300'}>
                      {selectedIds.includes(m.id) ? '✓' : '○'}
                    </Text>
                  </HStack>
                ))}
              </VStack>

              <Button w="100%" h={{ base: '50px', md: '56px' }}
                bgGradient="linear(to-r, purple.600, green.500)"
                color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                isLoading={sharing} loadingText="பகிருகிறோம்..."
                isDisabled={selectedIds.length === 0}
                onClick={handleConfirmShare}
                _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)' }}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                📍 {selectedIds.length} பேருடன் பகிர் / Share with {selectedIds.length}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
