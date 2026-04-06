/**
 * CreateAd.js — Business Agent Ad Creation
 * C:\Projects\PingMyFamily\web\src\pages\CreateAd.js
 *
 * Only accessible to users with is_business_agent=true
 * Allows: personal ad, group ad, broadcast ad
 * Media: image or video (via /api/photos/upload-media)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Button, Textarea, Input,
  Select, Spinner, Avatar,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const sectionBox = {
  w: '100%', bg: 'white', border: '1px solid',
  borderColor: 'purple.100', borderRadius: '2xl',
  px: { base: 4, md: 6 }, py: { base: 4, md: 5 },
  boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
};

export default function CreateAd() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const fileRef   = useRef();

  const [checking, setChecking]   = useState(true);
  const [isAgent,  setIsAgent]    = useState(false);
  const [adType,   setAdType]     = useState('broadcast');
  const [caption,  setCaption]    = useState('');
  const [ctaText,  setCtaText]    = useState('');
  const [ctaUrl,   setCtaUrl]     = useState('');
  const [waNumber, setWaNumber]   = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [targetKutham, setTargetKutham] = useState('');
  const [kuthams,  setKuthams]    = useState([]);
  const [family,   setFamily]     = useState([]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [uploading, setUploading] = useState(false);
  const [posting,   setPosting]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  useEffect(() => { checkAgent(); }, [user]);

  const checkAgent = async () => {
    try {
      const res = await api.get(`/api/users/me`);
      setIsAgent(res.data.user?.is_business_agent === true);
      if (res.data.user?.is_business_agent) {
        loadKuthams();
        loadFamily();
      }
    } catch (e) {}
    finally { setChecking(false); }
  };

  const loadKuthams = async () => {
    try {
      const res = await api.get('/api/kuthams');
      setKuthams(res.data.kuthams || []);
    } catch (e) {}
  };

  const loadFamily = async () => {
    try {
      const res = await api.get('/api/relationships/mine');
      setFamily(res.data.my_relationships?.filter(r => r.verification_status === 'verified') || []);
    } catch (e) {}
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    setMediaPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!caption.trim() && !mediaFile) {
      setError('Caption அல்லது media தேவை');
      return;
    }
    setPosting(true);
    setError('');
    setSuccess('');

    try {
      let mediaUrl = null;
      if (mediaFile) {
        setUploading(true);
        const form = new FormData();
        form.append('media', mediaFile);
        const uploadRes = await api.post('/api/photos/upload-media', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        mediaUrl = uploadRes.data.media_url;
        setUploading(false);
      }

      await api.post('/api/ads', {
        ad_type:        adType,
        target_user_id: adType === 'personal' ? targetUser  : null,
        target_kutham:  adType === 'group'    ? targetKutham : null,
        media_url:      mediaUrl,
        media_type:     mediaUrl ? mediaType : null,
        caption:        caption.trim() || null,
        cta_text:       ctaText.trim()  || null,
        cta_url:        ctaUrl.trim()   || null,
        whatsapp_number: waNumber.trim() || null,
      });

      setSuccess('✅ விளம்பரம் வெளியிடப்பட்டது / Ad published successfully!');
      setCaption(''); setCtaText(''); setCtaUrl(''); setWaNumber('');
      setMediaFile(null); setMediaPreview(null); setTargetUser(''); setTargetKutham('');
    } catch (e) {
      setError(e.response?.data?.error || 'விளம்பரம் வெளியிட முடியவில்லை');
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  if (checking) return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="purple.50">
      <Spinner color="purple.500" size="lg" />
    </Box>
  );

  if (!isAgent) return (
    <Box minH="100vh" bg="purple.50" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Box bg="white" borderRadius="2xl" p={8} textAlign="center" maxW="400px" boxShadow="lg">
        <Text fontSize="4xl" mb={4}>🔒</Text>
        <Text fontSize="xl" fontWeight="700" color="purple.800" mb={2}>
          Business Agent தேவை
        </Text>
        <Text fontSize="sm" color="gray.500" mb={6}>
          விளம்பரம் வெளியிட Admin உங்களை Business Agent ஆக மேம்படுத்த வேண்டும்.
        </Text>
        <Button colorScheme="purple" borderRadius="xl" onClick={() => navigate('/dashboard')}>
          Dashboard திரும்பு
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box minH="100vh" bg="purple.50" px={{ base: 4, md: 8 }} py={6} pb={20}>
      <VStack maxW="600px" mx="auto" spacing={4} align="stretch">

        {/* Header */}
        <Box {...sectionBox}>
          <HStack spacing={3}>
            <Button size="sm" variant="ghost" color="purple.500"
              onClick={() => navigate('/dashboard')}>← திரும்பு</Button>
            <Text fontSize="lg" fontWeight="800" color="purple.800">
              📢 புதிய விளம்பரம் / Create Ad
            </Text>
          </HStack>
        </Box>

        {/* Ad Type */}
        <Box {...sectionBox}>
          <Text fontSize="sm" fontWeight="700" color="purple.700" mb={3}>
            விளம்பர வகை / Ad Type
          </Text>
          <HStack spacing={2}>
            {[
              { value: 'broadcast', label: '📢 அனைவருக்கும்' },
              { value: 'group',     label: '🏮 குதம்'         },
              { value: 'personal',  label: '👤 தனிப்பட்ட'    },
            ].map(t => (
              <Button key={t.value} flex={1} size="sm"
                bg={adType === t.value ? 'purple.600' : 'purple.50'}
                color={adType === t.value ? 'white' : 'purple.600'}
                border="1px solid" borderColor="purple.200"
                borderRadius="xl" fontWeight="600"
                onClick={() => setAdType(t.value)}
                _hover={{ bg: adType === t.value ? 'purple.700' : 'purple.100' }}>
                {t.label}
              </Button>
            ))}
          </HStack>

          {/* Target selectors */}
          {adType === 'group' && (
            <Select mt={3} placeholder="குதம் தேர்ந்தெடுக்கவும்"
              value={targetKutham} onChange={e => setTargetKutham(e.target.value)}
              borderColor="purple.200" color="purple.800" _focus={{ borderColor: 'purple.400' }}>
              {kuthams.map(k => (
                <option key={k.id} value={k.name}>{k.name}</option>
              ))}
            </Select>
          )}

          {adType === 'personal' && (
            <Select mt={3} placeholder="குடும்பத்தினர் தேர்ந்தெடுக்கவும்"
              value={targetUser} onChange={e => setTargetUser(e.target.value)}
              borderColor="purple.200" color="purple.800" _focus={{ borderColor: 'purple.400' }}>
              {family.map(r => (
                <option key={r.to_user?.id} value={r.to_user?.id}>
                  {r.to_user?.name} ({r.relation_tamil})
                </option>
              ))}
            </Select>
          )}
        </Box>

        {/* Media */}
        <Box {...sectionBox}>
          <Text fontSize="sm" fontWeight="700" color="purple.700" mb={3}>
            படம் / வீடியோ (விரும்பினால்)
          </Text>
          <input type="file" ref={fileRef} style={{ display: 'none' }}
            accept="image/*,video/*" onChange={handleFileSelect} />

          {mediaPreview ? (
            <Box position="relative" borderRadius="xl" overflow="hidden" mb={3}>
              {mediaType === 'image'
                ? <img src={mediaPreview} alt="" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                : <video src={mediaPreview} controls style={{ width: '100%', maxHeight: '300px' }} />
              }
              <Button size="xs" position="absolute" top={2} right={2}
                bg="blackAlpha.700" color="white" borderRadius="full"
                onClick={() => { setMediaFile(null); setMediaPreview(null); }}>
                ✕
              </Button>
            </Box>
          ) : (
            <Box border="2px dashed" borderColor="purple.200" borderRadius="xl"
              p={8} textAlign="center" cursor="pointer"
              onClick={() => fileRef.current?.click()}
              _hover={{ bg: 'purple.50' }}>
              <Text fontSize="3xl" mb={2}>📷</Text>
              <Text fontSize="sm" color="purple.400">படம் அல்லது வீடியோ சேர்க்க கிளிக் செய்யவும்</Text>
            </Box>
          )}

          {!mediaPreview && (
            <Button w="100%" variant="outline" colorScheme="purple" borderRadius="xl"
              onClick={() => fileRef.current?.click()}>
              📎 Media சேர்
            </Button>
          )}
        </Box>

        {/* Caption */}
        <Box {...sectionBox}>
          <Text fontSize="sm" fontWeight="700" color="purple.700" mb={3}>
            விளக்கம் / Caption
          </Text>
          <Textarea
            placeholder="உங்கள் சேவை பற்றி எழுதவும்..."
            value={caption} onChange={e => setCaption(e.target.value)}
            borderColor="purple.200" color="purple.800" rows={4}
            _focus={{ borderColor: 'purple.400', boxShadow: 'none' }}
            _placeholder={{ color: 'gray.400' }}
            resize="none"
          />
        </Box>

        {/* CTA */}
        <Box {...sectionBox}>
          <Text fontSize="sm" fontWeight="700" color="purple.700" mb={3}>
            Call to Action (விரும்பினால்)
          </Text>
          <VStack spacing={3}>
            <Input placeholder="Button text (e.g. மேலும் அறிய)"
              value={ctaText} onChange={e => setCtaText(e.target.value)}
              borderColor="purple.200" color="purple.800"
              _focus={{ borderColor: 'purple.400', boxShadow: 'none' }}
              _placeholder={{ color: 'gray.400' }}
            />
            <Input placeholder="Website URL (e.g. https://yoursite.com)"
              value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
              borderColor="purple.200" color="purple.800"
              _focus={{ borderColor: 'purple.400', boxShadow: 'none' }}
              _placeholder={{ color: 'gray.400' }}
            />
            <Input placeholder="WhatsApp number (e.g. 919943125881)"
              value={waNumber} onChange={e => setWaNumber(e.target.value)}
              borderColor="purple.200" color="purple.800"
              _focus={{ borderColor: 'purple.400', boxShadow: 'none' }}
              _placeholder={{ color: 'gray.400' }}
            />
          </VStack>
        </Box>

        {/* Error / Success */}
        {error   && <Box bg="red.50"   border="1px solid" borderColor="red.200"   borderRadius="xl" px={4} py={3}><Text color="red.600"   fontSize="sm">{error}</Text></Box>}
        {success && <Box bg="green.50" border="1px solid" borderColor="green.200" borderRadius="xl" px={4} py={3}><Text color="green.700" fontSize="sm">{success}</Text></Box>}

        {/* Submit */}
        <Button
          size="lg" w="100%"
          bgGradient="linear(to-r, purple.600, green.500)"
          color="white" borderRadius="xl" fontWeight="800"
          isLoading={posting || uploading}
          loadingText={uploading ? 'Media பதிவேற்றுகிறோம்...' : 'வெளியிடுகிறோம்...'}
          onClick={handleSubmit}
          isDisabled={!caption.trim() && !mediaFile}
        >
          📢 விளம்பரம் வெளியிடு / Publish Ad
        </Button>

      </VStack>
    </Box>
  );
}
