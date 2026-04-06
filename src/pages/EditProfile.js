import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, FormControl, FormLabel, Avatar, Spinner
} from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ADMIN_WHATSAPP = '919513430615';
const ADMIN_EMAIL    = 'support@nalamini.com';
const ADMIN_TELEGRAM = 'FamilyRootsTeleBot';

export default function EditProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '', gender: '', date_of_birth: '',
    kutham: '', address: '', pincode: '', district: '', city: ''
  });
  const [kuthams, setKuthams] = useState([]);
  const [showContactAdmin, setShowContactAdmin] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    // Load profile
    api.get('/api/users/me').then(res => {
      const u = res.data.user;
      setForm({
        name: u.name || '',
        gender: u.gender || '',
        date_of_birth: u.date_of_birth?.split('T')[0] || '',
        kutham: u.kutham || '',
        address: u.address || '',
        pincode: u.pincode || '',
        district: u.district || '',
        city: u.city || ''
      });
      setProfilePhoto(u.profile_photo || '');
    });

    // Load kutham list
    api.get('/api/kuthams').then(res => {
      setKuthams(res.data.kuthams || []);
    }).catch(() => setKuthams([]));
  }, []);

  const inputStyle = {
  bg: 'purple.50', border: '1.5px solid', borderColor: 'purple.200',
  color: 'purple.900', h: '44px', fontSize: 'sm',
  _placeholder: { color: 'purple.300' },
  _focus: { bg: 'white', borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(124,58,237,0.1)' },
};

  const labelStyle = { color: 'gray.600', fontSize: { base: 'sm', md: 'md' } };
  const sectionBox = {
    w: '100%', bg: 'white', border: '1.5px solid',
    borderColor: 'purple.100', borderRadius: '2xl',
    px: { base: 5, md: 8 }, py: { base: 5, md: 6 }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Photo must be under 5MB'); return; }
    setPhotoLoading(true); setPhotoError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post('/api/photos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePhoto(res.data.photo_url);
      login(localStorage.getItem('pmf_token'), { ...user, profile_photo: res.data.photo_url });
      setSuccess('📸 புகைப்படம் புதுப்பிக்கப்பட்டது / Photo updated!');
    } catch (e) {
      setPhotoError(e.response?.data?.error || 'Photo upload failed');
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await api.put('/api/users/me', form);
      login(localStorage.getItem('pmf_token'), res.data.user);
      setSuccess('சுயவிவரம் புதுப்பிக்கப்பட்டது / Profile updated!');
    } catch (e) {
      setError(e.response?.data?.error || 'தோல்வி / Failed');
    } finally { setLoading(false); }
  };

  const adminMessage = encodeURIComponent(
    `வணக்கம்!\n\nfrootze-ல் என் குலப்பெயரை சேர்க்க கோருகிறேன்.\n\nபெயர்: ${form.name}\nதொலைபேசி: ${user?.phone}\nகுலப்பெயர்: [உங்கள் குலப்பெயர்]\n\nHi, I would like to add my kutham/family name to frootze.\nName: ${form.name}\nPhone: ${user?.phone}\nKutham: [your kutham name]`
  );

  return (
    <Box minH="100vh" w="100vw" bg="#f5f3ff"
      px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')}
              color="gray.500" fontSize="xl" _hover={{ color: 'purple.900' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="purple.900">👤 சுயவிவரம் / Profile</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.500">உங்கள் விவரங்களை புதுப்பிக்கவும்</Text>
            </Box>
          </HStack>
        </Box>

        {/* Photo Section */}
        <Box {...sectionBox}>
          <VStack spacing={4} align="center">
            <Text fontSize="md" fontWeight="600" color="gray.700" alignSelf="flex-start">
              📸 புகைப்படம் / Profile Photo
            </Text>
            <input type="file" accept="image/*" ref={fileInputRef}
              id="photo-upload-input" style={{ display: 'none' }}
              onChange={handlePhotoChange} />
            <Box position="relative" cursor="pointer"
              onClick={() => !photoLoading && fileInputRef.current?.click()}>
              <Avatar size="2xl" name={form.name || user?.name} src={profilePhoto}
                border="3px solid" borderColor="purple.400" />
              <Box position="absolute" bottom="0" right="0" bg="purple.600"
                borderRadius="full" w="32px" h="32px"
                display="flex" alignItems="center" justifyContent="center"
                border="2px solid white" fontSize="14px">
                {photoLoading ? <Spinner size="xs" color="purple.900" /> : '📷'}
              </Box>
            </Box>
            <label htmlFor="photo-upload-input" style={{
              display: 'inline-block', padding: '10px 24px',
              background: 'linear-gradient(to right, #7C3AED, #059669)',
              color: 'purple.900', borderRadius: '12px', fontSize: '14px',
              fontWeight: '700', cursor: 'pointer'
            }}>
              {photoLoading ? 'Uploading...' : '📷 புகைப்படம் மாற்று / Change Photo'}
            </label>
            {profilePhoto && !photoLoading && (
              <Button size="sm" variant="ghost" color="red.400"
                onClick={async () => {
                  try {
                    await api.delete('/api/photos/remove');
                    setProfilePhoto('');
                    login(localStorage.getItem('pmf_token'), { ...user, profile_photo: null });
                  } catch (e) {}
                }} _hover={{ color: 'red.300', bg: 'red.900' }}>
                🗑️ நீக்கு / Remove
              </Button>
            )}
            {photoError && <Text color="red.500" fontSize="sm">{photoError}</Text>}
            {success && success.includes('Photo') && (
              <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="xl" px={4} py={2}>
                <Text color="green.700" fontSize="sm">{success}</Text>
              </Box>
            )}
            <Text color="gray.400" fontSize="xs">JPG, PNG — அதிகபட்சம் 5MB</Text>
          </VStack>
        </Box>

        {/* Profile Form */}
        <Box {...sectionBox}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="md" fontWeight="600" color="gray.700">
              📋 அடிப்படை விவரம் / Basic Details
            </Text>

            <FormControl>
              <FormLabel {...labelStyle}>பெயர் / Name</FormLabel>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} {...inputStyle} />
            </FormControl>

            <FormControl>
              <FormLabel {...labelStyle}>பாலினம் / Gender</FormLabel>
              <Select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                {...inputStyle} placeholder="தேர்வு செய்யவும்">
                <option value="male" style={{background:'white', color:'#1a1a2e'}}>ஆண் / Male</option>
                <option value="female" style={{background:'white', color:'#1a1a2e'}}>பெண் / Female</option>
                <option value="other" style={{background:'white', color:'#1a1a2e'}}>மற்றவை / Other</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel {...labelStyle}>பிறந்த தேதி / Date of Birth</FormLabel>
              <Input type="date" value={form.date_of_birth}
                onChange={e => setForm({...form, date_of_birth: e.target.value})} {...inputStyle} />
            </FormControl>

            {/* Kutham Dropdown */}
            <FormControl>
              <FormLabel {...labelStyle}>குலம் / Kutham</FormLabel>
              <Select
                value={form.kutham}
                onChange={e => {
                  if (e.target.value === '__contact_admin__') {
                    setShowContactAdmin(true);
                    setForm({...form, kutham: ''});
                  } else {
                    setShowContactAdmin(false);
                    setForm({...form, kutham: e.target.value});
                  }
                }}
                {...inputStyle}
                placeholder="குலத்தை தேர்வு செய்யவும் / Select Kutham">
                {kuthams.map(k => (
                  <option key={k.id} value={k.name} style={{background:'white', color:'#1a1a2e'}}>
                    {k.name}
                  </option>
                ))}
                <option value="__contact_admin__" style={{background:'#1e1b4b', color:'#F59E0B'}}>
                  ➕ என் குலம் இல்லை — Admin-ஐ தொடர்பு கொள்ளவும்
                </option>
              </Select>
            </FormControl>

            {/* Contact Admin Section */}
            {showContactAdmin && (
              <Box bg="orange.50" border="1.5px solid" borderColor="orange.300"
                borderRadius="xl" px={4} py={4}>
                <Text color="orange.700" fontSize="sm" fontWeight="700" mb={1}>
                  📋 உங்கள் குலப்பெயரை சேர்க்க Admin-ஐ தொடர்பு கொள்ளவும்
                </Text>
                <Text color="orange.600" fontSize="xs" mb={4}>
                  Contact admin to add your family/kutham name to the approved list
                </Text>
                <VStack spacing={3} align="stretch">
                  <Button
                    h="44px" borderRadius="xl" fontSize="sm" fontWeight="700"
                    bg="green.600" color="purple.900"
                    onClick={() => window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${adminMessage}`, '_blank')}
                    _hover={{ bg: 'green.700' }}>
                    📱 WhatsApp Admin
                  </Button>
                  <Button
                    h="44px" borderRadius="xl" fontSize="sm" fontWeight="700"
                    bg="blue.600" color="purple.900"
                    onClick={() => window.open(`https://t.me/${ADMIN_TELEGRAM}`, '_blank')}
                    _hover={{ bg: 'blue.700' }}>
                    ✈️ Telegram — @{ADMIN_TELEGRAM}
                  </Button>
                  <Button
                    h="44px" borderRadius="xl" fontSize="sm" fontWeight="700"
                    bg="purple.600" color="purple.900"
                    onClick={() => window.open(`mailto:${ADMIN_EMAIL}?subject=Kutham Addition Request&body=${decodeURIComponent(adminMessage)}`, '_blank')}
                    _hover={{ bg: 'purple.700' }}>
                    📧 Email — {ADMIN_EMAIL}
                  </Button>
                </VStack>
              </Box>
            )}

            <FormControl>
              <FormLabel {...labelStyle}>முகவரி / Address</FormLabel>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                placeholder="தெரு, நகர்" {...inputStyle} />
            </FormControl>

            <HStack spacing={3}>
              <FormControl>
                <FormLabel {...labelStyle}>பின்கோட் / Pincode</FormLabel>
                <Input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})}
                  placeholder="600001" {...inputStyle} />
              </FormControl>
              <FormControl>
                <FormLabel {...labelStyle}>மாவட்டம் / District</FormLabel>
                <Input value={form.district} onChange={e => setForm({...form, district: e.target.value})}
                  placeholder="Chennai" {...inputStyle} />
              </FormControl>
            </HStack>

            {error && (
              <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="xl" px={4} py={3}>
                <Text color="red.600" fontSize="sm">{error}</Text>
              </Box>
            )}
            {success && !success.includes('Photo') && (
              <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="xl" px={4} py={3}>
                <Text color="green.700" fontSize="sm">{success}</Text>
              </Box>
            )}

            <Button w="100%" h={{ base: '50px', md: '56px' }}
              bgGradient="linear(to-r, purple.600, green.500)"
              color="purple.900" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
              isLoading={loading} onClick={handleSave}
              _hover={{ transform: 'translateY(-2px)' }}>
              சேமிக்கவும் / Save
            </Button>
          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
