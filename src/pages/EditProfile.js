import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, VStack, HStack, Text, Heading, Button, Input, Select, FormControl, FormLabel, Textarea } from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageLayout from '../components/PageLayout';

export default function EditProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', gender: '', date_of_birth: '', kutham: '', address: '', pincode: '', district: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/api/users/me').then(res => {
      const u = res.data.user;
      setForm({ name: u.name || '', gender: u.gender || '', date_of_birth: u.date_of_birth?.split('T')[0] || '', kutham: u.kutham || '', address: u.address || '', pincode: u.pincode || '', district: u.district || '', city: u.city || '' });
    });
  }, []);

  const inputStyle = {
    bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white',
    h: { base: '50px', md: '56px' }, fontSize: { base: 'md', md: 'lg' },
    _placeholder: { color: 'whiteAlpha.400' },
    _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
  };

  const labelStyle = { color: 'whiteAlpha.700', fontSize: { base: 'sm', md: 'md' } };

  const handleSave = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await api.put('/api/users/me', form);
      login(localStorage.getItem('pmf_token'), res.data.user);
      setSuccess('சுயவிவரம் புதுப்பிக்கப்பட்டது / Profile updated!');
    } catch (e) { setError(e.response?.data?.error || 'தோல்வி / Failed'); }
    finally { setLoading(false); }
  };

  const sectionBox = { w: '100%', bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.200', borderRadius: '2xl', px: { base: 5, md: 8 }, py: { base: 5, md: 6 } };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        <Box {...sectionBox}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">👤 சுயவிவரம் / Profile</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">உங்கள் விவரங்களை புதுப்பிக்கவும்</Text>
            </Box>
          </HStack>
        </Box>

        <Box {...sectionBox}>
          <VStack spacing={4} align="stretch">
            <FormControl><FormLabel {...labelStyle}>பெயர் / Name</FormLabel><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} {...inputStyle} /></FormControl>
            <FormControl><FormLabel {...labelStyle}>பாலினம் / Gender</FormLabel>
              <Select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} {...inputStyle} placeholder="தேர்வு செய்யவும்">
                <option value="male" style={{background:'#1e1b4b'}}>ஆண் / Male</option>
                <option value="female" style={{background:'#1e1b4b'}}>பெண் / Female</option>
                <option value="other" style={{background:'#1e1b4b'}}>மற்றவை / Other</option>
              </Select>
            </FormControl>
            <FormControl><FormLabel {...labelStyle}>பிறந்த தேதி / Date of Birth</FormLabel><Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} {...inputStyle} /></FormControl>
            <FormControl><FormLabel {...labelStyle}>குலம் / Kutham</FormLabel><Input value={form.kutham} onChange={e => setForm({...form, kutham: e.target.value})} placeholder="உதா: வேளாளர்" {...inputStyle} /></FormControl>
            <FormControl><FormLabel {...labelStyle}>முகவரி / Address</FormLabel><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="தெரு, நகர்" {...inputStyle} /></FormControl>
            <HStack spacing={3}>
              <FormControl><FormLabel {...labelStyle}>பின்கோட் / Pincode</FormLabel><Input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} placeholder="600001" {...inputStyle} /></FormControl>
              <FormControl><FormLabel {...labelStyle}>மாவட்டம் / District</FormLabel><Input value={form.district} onChange={e => setForm({...form, district: e.target.value})} placeholder="Chennai" {...inputStyle} /></FormControl>
            </HStack>
            {error && <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}><Text color="red.200" fontSize="sm">{error}</Text></Box>}
            {success && <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}><Text color="green.200" fontSize="sm">{success}</Text></Box>}
            <Button w="100%" h={{ base: '50px', md: '56px' }} bgGradient="linear(to-r, purple.600, green.500)" color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl" isLoading={loading} onClick={handleSave} _hover={{ transform: 'translateY(-2px)' }}>சேமிக்கவும் / Save</Button>
          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
