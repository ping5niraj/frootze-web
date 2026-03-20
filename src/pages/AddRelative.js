import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, FormControl, FormLabel, SimpleGrid, InputGroup, InputLeftAddon
} from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

const RELATIONS = [
  { value: 'father',   tamil: 'அப்பா',     english: 'Father'   },
  { value: 'mother',   tamil: 'அம்மா',     english: 'Mother'   },
  { value: 'spouse',   tamil: 'மனைவி/கணவன்', english: 'Spouse' },
  { value: 'brother',  tamil: 'அண்ணன்/தம்பி', english: 'Brother' },
  { value: 'sister',   tamil: 'அக்கா/தங்கை', english: 'Sister'  },
  { value: 'son',      tamil: 'மகன்',      english: 'Son'      },
  { value: 'daughter', tamil: 'மகள்',      english: 'Daughter' },
];

const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white',
  h: { base: '50px', md: '56px' }, fontSize: { base: 'md', md: 'lg' },
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
};

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.200',
  borderRadius: '2xl', px: { base: 5, md: 8 },
};

export default function AddRelative() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [relationType, setRelationType] = useState('');
  const [email, setEmail] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifStatus, setNotifStatus] = useState({ whatsapp: false, email: false, telegram: false });

  const selectedRelation = RELATIONS.find(r => r.value === relationType);

  const handleAdd = async () => {
    setError(''); setSuccess('');
    if (!phone || phone.length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
    if (!relationType) { setError('உறவை தேர்வு செய்யவும் / Select relation'); return; }
    setLoading(true);

    try {
      // Add relationship
      await api.post('/api/relationships', {
        to_user_phone: phone,
        relation_type: relationType,
        relation_tamil: selectedRelation?.tamil,
      });

      const inviteLink = `https://frootze.com?invite=${user?.id}`;
      const notifResults = { whatsapp: false, email: false, telegram: false };

      // Send Email notification
      if (email) {
        try {
          await axios.post(`${BASE_URL}/api/auth/send-invite-email`, {
            to_email: email,
            from_name: user?.name,
            relation_tamil: selectedRelation?.tamil,
            invite_link: inviteLink,
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('pmf_token')}` }
          });
          notifResults.email = true;
        } catch (e) { console.log('Email failed:', e.message); }
      }

      // Send Telegram notification
      if (telegramUsername) {
        try {
          const token = localStorage.getItem('pmf_token');
          const res = await axios.post(`${BASE_URL}/api/messages/send-telegram`, {
            to_username: telegramUsername,
            from_name: user?.name,
            relation_tamil: selectedRelation?.tamil,
            invite_link: inviteLink,
          }, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data.success) notifResults.telegram = true;
        } catch (e) { console.log('Telegram failed:', e.message); }
      }

      setNotifStatus(notifResults);
      setSuccess(`✅ ${selectedRelation?.tamil} சேர்க்கப்பட்டார்! / Added successfully!`);

      // Open WhatsApp automatically
      const waMessage = encodeURIComponent(
        `🌳 வணக்கம்!\n\n${user?.name} உங்களை frootze குடும்ப மரத்தில் ${selectedRelation?.tamil} ஆக சேர்க்க அழைக்கிறார்.\n\nகீழே உள்ள link-ஐ கிளிக் செய்து சேரவும்:\n${inviteLink}\n\n🆓 இலவசம் · frootze.com`
      );
      window.open(`https://wa.me/?text=${waMessage}`, '_blank');
      notifResults.whatsapp = true;
      setNotifStatus({ ...notifResults });

    } catch (err) {
      setError(err.response?.data?.error || 'சேர்க்க தோல்வி / Failed to add');
    } finally { setLoading(false); }
  };

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 4, md: 8 }} py={6}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        {/* Section 1 — Header */}
        <Box {...sectionBox} py={5}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">👨‍👩‍👧 குடும்பத்தினரை சேர்</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Add Family Member</Text>
            </Box>
          </HStack>
        </Box>

        {/* Section 2 — Required Fields */}
        <Box {...sectionBox} py={{ base: 6, md: 8 }}>
          <VStack spacing={5} align="stretch">
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" color="whiteAlpha.800">
              அடிப்படை விவரம் / Basic Details *
            </Text>

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>தொலைபேசி எண் / Phone *</FormLabel>
              <InputGroup size="lg">
                <InputLeftAddon
                  bg="whiteAlpha.200" border="1px solid" borderColor="whiteAlpha.300"
                  color="white" fontSize="sm" fontWeight="600" h={{ base: '50px', md: '56px' }} px={4}>
                  🇮🇳 +91
                </InputLeftAddon>
                <Input
                  type="tel" maxLength={10} placeholder="9999999999"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  {...inputStyle}
                />
              </InputGroup>
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>உறவு / Relation *</FormLabel>
              <Select placeholder="உறவை தேர்வு செய்யவும்" value={relationType}
                onChange={e => setRelationType(e.target.value)} {...inputStyle}>
                {RELATIONS.map(r => (
                  <option key={r.value} value={r.value} style={{ background: '#1e1b4b' }}>
                    {r.tamil} / {r.english}
                  </option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        </Box>

        {/* Section 3 — Notification Options */}
        <Box {...sectionBox} py={{ base: 5, md: 6 }}>
          <VStack spacing={4} align="stretch">
            <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" color="whiteAlpha.800">
              அறிவிப்பு / Notifications (optional)
            </Text>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="whiteAlpha.500">
              WhatsApp automatically opens. Add email/telegram for extra notifications.
            </Text>

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>
                📧 Email (optional)
              </FormLabel>
              <Input
                type="email" placeholder="relative@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                {...inputStyle}
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>
                ✈️ Telegram Username (optional)
              </FormLabel>
              <Input
                placeholder="@username or chat_id"
                value={telegramUsername} onChange={e => setTelegramUsername(e.target.value)}
                {...inputStyle}
              />
            </FormControl>

            {/* Notification status */}
            {success && (
              <SimpleGrid columns={3} spacing={3}>
                {[
                  { key: 'whatsapp', icon: '📱', label: 'WhatsApp' },
                  { key: 'email',    icon: '📧', label: 'Email'    },
                  { key: 'telegram', icon: '✈️', label: 'Telegram' },
                ].map(n => (
                  <Box key={n.key} bg={notifStatus[n.key] ? 'green.900' : 'whiteAlpha.100'}
                    border="1px solid" borderColor={notifStatus[n.key] ? 'green.500' : 'whiteAlpha.200'}
                    borderRadius="xl" px={3} py={3} textAlign="center">
                    <Text fontSize="xl">{n.icon}</Text>
                    <Text fontSize="xs" color={notifStatus[n.key] ? 'green.300' : 'whiteAlpha.400'} mt={1}>
                      {notifStatus[n.key] ? '✓ Sent' : n.label}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </VStack>
        </Box>

        {/* Section 4 — Submit */}
        <Box {...sectionBox} py={{ base: 5, md: 6 }}>
          <VStack spacing={4} align="stretch">

            {error && <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}><Text color="red.200" fontSize="sm">{error}</Text></Box>}
            {success && <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}><Text color="green.200" fontSize={{ base: 'sm', md: 'md' }}>{success}</Text></Box>}

            <Button w="100%" h={{ base: '50px', md: '56px' }}
              bgGradient="linear(to-r, purple.600, green.500)"
              color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
              isLoading={loading} loadingText="சேர்க்கிறோம்..."
              isDisabled={phone.length < 10 || !relationType}
              onClick={handleAdd}
              _hover={{ bgGradient: 'linear(to-r, purple.700, green.600)', transform: 'translateY(-2px)' }}
              _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
              📱 சேர் + WhatsApp அனுப்பு / Add & Notify
            </Button>

            {success && (
              <Button w="100%" variant="ghost" color="whiteAlpha.600"
                onClick={() => navigate('/dashboard')} _hover={{ color: 'white' }}>
                ← Dashboard-க்கு திரும்பு
              </Button>
            )}

          </VStack>
        </Box>

      </VStack>
    </Box>
  );
}
