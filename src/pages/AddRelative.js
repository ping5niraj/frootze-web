import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Button, Input,
  Select, FormControl, FormLabel, SimpleGrid,
  InputGroup, InputLeftAddon
} from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import html2canvas from 'html2canvas';

const BASE_URL = process.env.REACT_APP_PMF_API || 'https://pingmyfamily-backend-production.up.railway.app';

const RELATIONS = [
  { value: 'father',               tamil: 'அப்பா',                   english: 'Father'             },
  { value: 'mother',               tamil: 'அம்மா',                   english: 'Mother'             },
  { value: 'spouse',               tamil: 'மனைவி/கணவன்',            english: 'Spouse'             },
  { value: 'brother',              tamil: 'அண்ணன்/தம்பி',           english: 'Brother'            },
  { value: 'sister',               tamil: 'அக்கா/தங்கை',            english: 'Sister'             },
  { value: 'son',                  tamil: 'மகன்',                    english: 'Son'                },
  { value: 'daughter',             tamil: 'மகள்',                    english: 'Daughter'           },
  { value: 'grandfather_paternal', tamil: 'தாத்தா (அப்பா பக்கம்)', english: 'Grandfather (Paternal)' },
  { value: 'grandmother_paternal', tamil: 'பாட்டி (அப்பா பக்கம்)', english: 'Grandmother (Paternal)' },
  { value: 'grandfather_maternal', tamil: 'தாத்தா (அம்மா பக்கம்)', english: 'Grandfather (Maternal)' },
  { value: 'grandmother_maternal', tamil: 'பாட்டி (அம்மா பக்கம்)', english: 'Grandmother (Maternal)' },
  { value: 'grandson',             tamil: 'பேரன்',                   english: 'Grandson'           },
  { value: 'granddaughter',        tamil: 'பேத்தி',                  english: 'Granddaughter'      },
];

const sectionBox = {
  w: '100%', bg: 'whiteAlpha.100', border: '1px solid',
  borderColor: 'whiteAlpha.200', borderRadius: '2xl',
  px: { base: 5, md: 8 },
};

const inputStyle = {
  bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.300', color: 'white',
  h: { base: '50px', md: '56px' }, fontSize: { base: 'md', md: 'lg' },
  _placeholder: { color: 'whiteAlpha.400' },
  _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 3px rgba(128,0,255,0.2)' },
};

export default function AddRelative() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOffline, setIsOffline] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [offlineName, setOfflineName] = useState('');
  const [offlineGender, setOfflineGender] = useState('');
  const [relationType, setRelationType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [notifStatus, setNotifStatus] = useState({ whatsapp: false, email: false, telegram: false });
  const [whatsappLink, setWhatsappLink] = useState('');
  const [treeCapturing, setTreeCapturing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);

  const selectedRelation = RELATIONS.find(r => r.value === relationType);

  // ── Generate beautiful invite image ──
  const generateInviteImage = async () => {
    try {
      const res = await api.get('/api/relationships/mine');
      const members = res.data.my_relationships || [];

      const W = 800;
      const H = 1000;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0f0c29');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#0f0c29');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Decorative circles
      ctx.fillStyle = 'rgba(124,58,237,0.15)';
      ctx.beginPath(); ctx.arc(700, 100, 200, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(100, 800, 150, 0, Math.PI*2); ctx.fill();

      // Header band
      const headerGrad = ctx.createLinearGradient(0, 0, W, 130);
      headerGrad.addColorStop(0, '#7C3AED');
      headerGrad.addColorStop(1, '#5B21B6');
      ctx.fillStyle = headerGrad;
      ctx.beginPath();
      ctx.roundRect(30, 30, W-60, 130, 20);
      ctx.fill();

      // frootze logo text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🌳 frootze', W/2, 85);
      ctx.font = '18px Arial';
      ctx.fillStyle = '#DDD6FE';
      ctx.fillText('உங்கள் குடும்பம் · உங்கள் வேர்கள்', W/2, 120);

      // Invitation title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${user?.name}`, W/2, 210);
      ctx.font = '20px Arial';
      ctx.fillStyle = '#C4B5FD';
      ctx.fillText('உங்களை குடும்ப மரத்தில் சேர அழைக்கிறார்', W/2, 248);
      ctx.fillStyle = '#A78BFA';
      ctx.font = '16px Arial';
      ctx.fillText('is inviting you to join their family tree', W/2, 275);

      // Divider
      ctx.strokeStyle = 'rgba(167,139,250,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60, 300); ctx.lineTo(W-60, 300); ctx.stroke();

      // Family members section
      ctx.fillStyle = '#A78BFA';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('👨‍👩‍👧 குடும்பத்தினர் / Family Members', 60, 340);

      // Draw member cards
      const displayMembers = members.slice(0, 6);
      const cols = 3;
      const cardW = 210; const cardH = 80;
      const startX = 55; const startY = 360;
      const gap = 15;

      displayMembers.forEach((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + gap);

        // Card background
        ctx.fillStyle = 'rgba(124,58,237,0.25)';
        ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 12); ctx.fill();
        ctx.strokeStyle = 'rgba(167,139,250,0.4)';
        ctx.lineWidth = 1; ctx.stroke();

        // Avatar circle
        ctx.fillStyle = '#5B21B6';
        ctx.beginPath(); ctx.arc(x+30, y+40, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
        const nm = m.to_user?.name || m.offline_name || '?';
        ctx.fillText(nm.charAt(0).toUpperCase(), x+30, y+46);

        // Name and relation
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
        const shortName = nm.length > 12 ? nm.substring(0,12)+'…' : nm;
        ctx.fillText(shortName, x+58, y+34);
        ctx.fillStyle = '#C4B5FD';
        ctx.font = '11px Arial';
        ctx.fillText(m.relation_tamil || '', x+58, y+54);
      });

      if (members.length > 6) {
        ctx.fillStyle = '#A78BFA';
        ctx.font = '14px Arial'; ctx.textAlign = 'center';
        ctx.fillText(`+ ${members.length - 6} more members`, W/2, startY + 3*(cardH+gap) + 20);
      }

      // Call to action box
      const ctaY = 700;
      const ctaGrad = ctx.createLinearGradient(0, ctaY, W, ctaY+160);
      ctaGrad.addColorStop(0, '#7C3AED');
      ctaGrad.addColorStop(1, '#059669');
      ctx.fillStyle = ctaGrad;
      ctx.beginPath(); ctx.roundRect(30, ctaY, W-60, 160, 20); ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center';
      ctx.fillText('இப்போதே சேருங்கள்! Join Now! 🌟', W/2, ctaY+50);
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('www.frootze.com', W/2, ctaY+105);
      ctx.font = '16px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('Free · குடும்ப மரம் · Family Tree', W/2, ctaY+140);

      // Footer
      ctx.fillStyle = 'rgba(167,139,250,0.5)';
      ctx.font = '13px Arial'; ctx.textAlign = 'center';
      ctx.fillText('frootze.com — உங்கள் குடும்பம், உங்கள் வேர்கள் 🌳', W/2, H-30);

      return canvas.toDataURL('image/png');
    } catch(e) { console.error('Invite image gen failed:', e); return null; }
  };

  // ── Generate simple tree image (kept for reference) ──
  const generateTreeImage = generateInviteImage;

  // ── Handle share platform ──
  const handleShare = (platform) => {
    if (!shareData) return;
    const { inviteText, sharePhone, shareEmail } = shareData;
    const encodedText = encodeURIComponent(inviteText);
    const frootzeUrl = encodeURIComponent('https://frootze.com');
    switch(platform) {
      case 'whatsapp':
        window.open(`https://wa.me/91${sharePhone}?text=${encodedText}`, '_blank'); break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=https://frootze.com&text=${encodedText}`, '_blank'); break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${frootzeUrl}`, '_blank'); break;
      case 'instagram':
        navigator.clipboard.writeText(inviteText + '\n\nhttps://frootze.com');
        window.open('https://www.instagram.com/', '_blank');
        alert('✅ Message copied! Paste it in your Instagram post or story.');
        break;
      case 'email':
        const subject = encodeURIComponent(`${user?.name} உங்களை frootze குடும்ப மரத்தில் சேர அழைக்கிறார்!`);
        window.open(`mailto:${shareEmail || ''}?subject=${subject}&body=${encodedText}`, '_blank'); break;
      case 'copy':
        navigator.clipboard.writeText(inviteText + '\n\nhttps://frootze.com');
        setCopied(true); setTimeout(() => setCopied(false), 2000); break;
      default: break;
    }
  };

  // ── Handle Add (online/offline) ──
  const handleAdd = async () => {
    setError(''); setSuccess(''); setShowInvitePrompt(false);
    if (!relationType) { setError('உறவை தேர்வு செய்யவும்'); return; }
    if (isOffline) {
      if (!offlineName.trim()) { setError('பெயர் உள்ளிடவும்'); return; }
      if (!offlineGender) { setError('பாலினம் தேர்வு செய்யவும்'); return; }
    } else {
      if (!phone || phone.length < 10) { setError('சரியான 10 இலக்க எண் உள்ளிடவும்'); return; }
    }
    setLoading(true);
    try {
      if (isOffline) {
        await api.post('/api/relationships', {
          relation_type: relationType, relation_tamil: selectedRelation?.tamil,
          is_offline: true, offline_name: offlineName.trim(), offline_gender: offlineGender,
        });
        setSuccess(`🕊️ ${offlineName} குடும்ப மரத்தில் சேர்க்கப்பட்டார்`);
      } else {
        const res = await api.post('/api/relationships', {
          to_user_phone: phone, relation_type: relationType,
          relation_tamil: selectedRelation?.tamil, is_offline: false,
        });
        const notifResults = {
          whatsapp: false,
          email: res.data.notifications?.email || false,
          telegram: res.data.notifications?.telegram || false,
        };
        setNotifStatus(notifResults);
        setWhatsappLink(res.data.whatsapp_link || '');
        setSuccess(`✅ கோரிக்கை அனுப்பப்பட்டது! ${selectedRelation?.tamil} உங்கள் கோரிக்கையை Dashboard-ல் காண்பார்.`);
        if (res.data.whatsapp_link) {
          window.open(res.data.whatsapp_link, '_blank');
          notifResults.whatsapp = true;
          setNotifStatus({ ...notifResults });
        }
        if (email && !notifResults.email) {
          try {
            await axios.post(`${BASE_URL}/api/auth/send-invite-email`, {
              to_email: email, from_name: user?.name,
              relation_tamil: selectedRelation?.tamil, invite_link: 'https://frootze.com',
            }, { headers: { Authorization: `Bearer ${localStorage.getItem('pmf_token')}` } });
            notifResults.email = true; setNotifStatus({ ...notifResults });
          } catch (e) {}
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '';
      if (errorMsg.includes('No user found') || errorMsg.includes('register')) {
        setShowInvitePrompt(true);
      } else {
        setError(errorMsg || 'சேர்க்க தோல்வி / Failed');
      }
    } finally { setLoading(false); }
  };

  // ── Handle Send Invite (unregistered) ──
  const handleSendInvite = async () => {
    setTreeCapturing(true);
    setShowInvitePrompt(false);
    try {
      const imageUrl = await generateTreeImage();
      if (imageUrl) {
        const a = document.createElement('a');
        a.href = imageUrl; a.download = `${user?.name}-family-tree-frootze.png`; a.click();
      }
      const res2 = await api.get('/api/relationships/mine');
      const members2 = (res2.data.my_relationships || []).slice(0, 5);
      const gIcon = (rel) => {
        if (['father','brother','son','grandfather_paternal','grandfather_maternal'].includes(rel.relation_type)) return '👨';
        if (['mother','sister','daughter','grandmother_paternal','grandmother_maternal'].includes(rel.relation_type)) return '👩';
        return '👤';
      };
      const memberLines = members2.map(m => `${gIcon(m)} *${m.to_user?.name || m.offline_name}* — ${m.relation_tamil}`).join('\n');
      const inviteText = [
        `🌳 *உங்கள் குடும்பம் frootze-ல் உங்களுக்காக காத்திருக்கிறது!*`,
        `_(Your family is waiting for you on frootze!)_`,
        ``,
        memberLines ? `நமது குடும்ப மரத்தில் ஏற்கனவே உள்ளவர்கள்:\n${memberLines}` : ``,
        ``,
        `*${user?.name}* உங்களை *${selectedRelation?.tamil || 'குடும்பத்தினர்'}* ஆக சேர்க்க அழைக்கிறார்.`,
        ``,
        imageUrl ? `👆 *படத்தில் நம் குடும்ப மரத்தை பாருங்கள்!*\n_(Attach the downloaded image)_` : ``,
        ``,
        `உங்கள் இடம் காலியாக உள்ளது — இப்போதே சேருங்கள்! 🌟`,
        `👇`,
        `🔗 *https://frootze.com*`,
        ``,
        `_இலவசம் · frootze குடும்ப மரம்_ 🌳`,
      ].filter(l => l !== undefined).join('\n');

      setShareData({ inviteText, sharePhone: phone, shareEmail: email, imageUrl });
      setShowShareModal(true);
    } catch(e) {
      console.error(e);
    } finally { setTreeCapturing(false); }
  };

  return (
    <>
      <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
        px={{ base: 4, md: 8 }} py={6}>
        <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

          {/* Header */}
          <Box {...sectionBox} py={5}>
            <HStack spacing={3}>
              <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
              <Box>
                <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">👨‍👩‍👧 குடும்பத்தினரை சேர்</Heading>
                <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Add Family Member</Text>
              </Box>
            </HStack>
          </Box>

          {/* Online / Offline Toggle */}
          <Box {...sectionBox} py={4}>
            <Text fontSize="sm" fontWeight="600" color="whiteAlpha.700" mb={3}>
              இவர் frootze-ல் உள்ளாரா? / Are they on frootze?
            </Text>
            <HStack spacing={3}>
              <Button flex={1} h="48px"
                bg={!isOffline ? 'purple.600' : 'whiteAlpha.100'}
                color={!isOffline ? 'white' : 'whiteAlpha.600'}
                border="1px solid" borderColor={!isOffline ? 'purple.400' : 'whiteAlpha.200'}
                borderRadius="xl" fontSize="sm" fontWeight="700"
                onClick={() => { setIsOffline(false); setError(''); setSuccess(''); }}
                _hover={{ bg: !isOffline ? 'purple.700' : 'whiteAlpha.200' }}>
                📱 ஆம் — frootze-ல் உள்ளார் / Yes
              </Button>
              <Button flex={1} h="48px"
                bg={isOffline ? 'orange.700' : 'whiteAlpha.100'}
                color={isOffline ? 'white' : 'whiteAlpha.600'}
                border="1px solid" borderColor={isOffline ? 'orange.400' : 'whiteAlpha.200'}
                borderRadius="xl" fontSize="sm" fontWeight="700"
                onClick={() => { setIsOffline(true); setError(''); setSuccess(''); }}
                _hover={{ bg: isOffline ? 'orange.800' : 'whiteAlpha.200' }}>
                🕊️ இல்லை — காலமானவர் / Deceased
              </Button>
            </HStack>
          </Box>

          {/* Form */}
          <Box {...sectionBox} py={{ base: 6, md: 8 }}>
            <VStack spacing={5} align="stretch">
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" color="whiteAlpha.800">
                அடிப்படை விவரம் / Basic Details
              </Text>

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

              {!isOffline && (
                <>
                  <FormControl>
                    <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>தொலைபேசி எண் / Phone *</FormLabel>
                    <InputGroup size="lg">
                      <InputLeftAddon bg="whiteAlpha.200" border="1px solid" borderColor="whiteAlpha.300"
                        color="white" fontSize="sm" fontWeight="600" h={{ base: '50px', md: '56px' }} px={4}>
                        🇮🇳 +91
                      </InputLeftAddon>
                      <Input type="tel" maxLength={10} placeholder="9999999999"
                        value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        {...inputStyle} />
                    </InputGroup>
                  </FormControl>
                  <FormControl>
                    <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>📧 Email (optional)</FormLabel>
                    <Input type="email" placeholder="relative@email.com"
                      value={email} onChange={e => setEmail(e.target.value)} {...inputStyle} />
                  </FormControl>
                  <Box bg="purple.900" border="1px solid" borderColor="purple.600" borderRadius="xl" px={4} py={3}>
                    <Text fontSize="xs" color="purple.300" fontWeight="600" mb={1}>💡 குறிப்பு / Note</Text>
                    <Text fontSize="xs" color="purple.200">கோரிக்கை அனுப்பியதும் WhatsApp தானாக திறக்கும். அவர் frootze Dashboard-ல் ஏற்கலாம்.</Text>
                  </Box>
                </>
              )}

              {isOffline && (
                <>
                  <Box bg="orange.900" border="1px solid" borderColor="orange.600" borderRadius="xl" px={4} py={3}>
                    <Text fontSize="xs" color="orange.300" fontWeight="600" mb={1}>🕊️ காலமானவர் / Deceased Member</Text>
                    <Text fontSize="xs" color="orange.200">இவர் நேரடியாக குடும்ப மரத்தில் சேர்க்கப்படுவார். தொலைபேசி தேவையில்லை.</Text>
                  </Box>
                  <FormControl>
                    <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>பெயர் / Name *</FormLabel>
                    <Input placeholder="உதா: Raman Kumar" value={offlineName}
                      onChange={e => setOfflineName(e.target.value)} {...inputStyle} />
                  </FormControl>
                  <FormControl>
                    <FormLabel color="whiteAlpha.700" fontSize={{ base: 'sm', md: 'md' }}>பாலினம் / Gender *</FormLabel>
                    <Select placeholder="தேர்வு செய்யவும்" value={offlineGender}
                      onChange={e => setOfflineGender(e.target.value)} {...inputStyle}>
                      <option value="male" style={{ background: '#1e1b4b' }}>ஆண் / Male</option>
                      <option value="female" style={{ background: '#1e1b4b' }}>பெண் / Female</option>
                    </Select>
                  </FormControl>
                </>
              )}
            </VStack>
          </Box>

          {/* Result Section */}
          <Box {...sectionBox} py={{ base: 5, md: 6 }}>
            <VStack spacing={4} align="stretch">

              {showInvitePrompt && (
                <Box bg="yellow.900" border="1px solid" borderColor="yellow.500" borderRadius="xl" px={4} py={4}>
                  <Text color="yellow.200" fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" mb={1}>
                    ⚠️ இந்த எண் frootze-ல் பதிவு செய்யப்படவில்லை
                  </Text>
                  <Text color="yellow.300" fontSize="sm" mb={3}>
                    This number is not on frootze yet. Send them an invite with your family tree!
                  </Text>
                  <Box bg="blue.900" border="1px solid" borderColor="blue.500" borderRadius="xl" px={3} py={3} mb={3}>
                    <Text fontSize="xs" color="blue.200" fontWeight="700" mb={1}>📋 படிகள் / Steps:</Text>
                    <Text fontSize="xs" color="blue.300">1️⃣ குடும்ப மரம் தானாக பதிவிறக்கம் ஆகும்</Text>
                    <Text fontSize="xs" color="blue.300">2️⃣ தளத்தை தேர்வு செய்யும் திரை வரும்</Text>
                    <Text fontSize="xs" color="blue.300">3️⃣ WhatsApp-ல் 📎 கிளிக் செய்து படத்தை இணைக்கவும்</Text>
                  </Box>
                  <HStack spacing={3}>
                    <Button flex={1} h="44px" bgGradient="linear(to-r, purple.600, green.500)"
                      color="white" fontSize="sm" fontWeight="700" borderRadius="xl"
                      isLoading={treeCapturing} loadingText="உருவாக்குகிறோம்..."
                      onClick={handleSendInvite}>
                      📤 பகிர் / Share Invite
                    </Button>
                    <Button flex={1} h="44px" variant="ghost" color="whiteAlpha.500"
                      fontSize="sm" borderRadius="xl"
                      onClick={() => setShowInvitePrompt(false)}
                      _hover={{ color: 'white' }}>
                      ரத்து / Cancel
                    </Button>
                  </HStack>
                </Box>
              )}

              {error && (
                <Box bg="red.900" border="1px solid" borderColor="red.500" borderRadius="xl" px={4} py={3}>
                  <Text color="red.200" fontSize="sm">{error}</Text>
                </Box>
              )}

              {success && (
                <Box bg="green.900" border="1px solid" borderColor="green.500" borderRadius="xl" px={4} py={3}>
                  <Text color="green.200" fontSize={{ base: 'sm', md: 'md' }}>{success}</Text>
                </Box>
              )}

              {!isOffline && success && (
                <SimpleGrid columns={3} spacing={3}>
                  {[
                    { key: 'whatsapp', icon: '📱', label: 'WhatsApp' },
                    { key: 'email',    icon: '📧', label: 'Email'    },
                    { key: 'telegram', icon: '✈️', label: 'Telegram' },
                  ].map(n => (
                    <Box key={n.key}
                      bg={notifStatus[n.key] ? 'green.900' : 'whiteAlpha.100'}
                      border="1px solid"
                      borderColor={notifStatus[n.key] ? 'green.500' : 'whiteAlpha.200'}
                      borderRadius="xl" px={3} py={3} textAlign="center">
                      <Text fontSize="xl">{n.icon}</Text>
                      <Text fontSize="xs" color={notifStatus[n.key] ? 'green.300' : 'whiteAlpha.400'} mt={1}>
                        {notifStatus[n.key] ? '✓ Sent' : n.label}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              )}

              {!success && !showInvitePrompt && (
                <Button w="100%" h={{ base: '50px', md: '56px' }}
                  bgGradient={isOffline ? 'linear(to-r, orange.600, orange.500)' : 'linear(to-r, purple.600, green.500)'}
                  color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                  isLoading={loading} loadingText="சேர்க்கிறோம்..."
                  isDisabled={isOffline ? (!offlineName.trim() || !offlineGender || !relationType) : (phone.length < 10 || !relationType)}
                  onClick={handleAdd}
                  _hover={{ transform: 'translateY(-2px)' }}
                  _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                  {isOffline ? '🕊️ குடும்ப மரத்தில் சேர் / Add to Tree' : '👨‍👩‍👧 கோரிக்கை அனுப்பு / Send Request'}
                </Button>
              )}

              {success && (
                <HStack spacing={3}>
                  {whatsappLink && (
                    <Button flex={1} h="50px" colorScheme="whatsapp" borderRadius="xl"
                      onClick={() => window.open(whatsappLink, '_blank')}>
                      📱 WhatsApp மீண்டும் திற
                    </Button>
                  )}
                  <Button flex={1} h="50px" variant="ghost" color="whiteAlpha.600" borderRadius="xl"
                    onClick={() => navigate('/dashboard')} _hover={{ color: 'white' }}>
                    ← Dashboard
                  </Button>
                </HStack>
              )}

            </VStack>
          </Box>

        </VStack>
      </Box>

      {/* Share Modal */}
      {showShareModal && shareData && (
        <Box position="fixed" top="0" left="0" right="0" bottom="0"
          bg="blackAlpha.800" zIndex={1000}
          display="flex" alignItems="center" justifyContent="center" px={4}
          onClick={() => setShowShareModal(false)}>
          <Box bg="#1e1b4b" border="1px solid" borderColor="whiteAlpha.200"
            borderRadius="2xl" w="100%" maxW="400px" overflow="hidden"
            onClick={e => e.stopPropagation()}>
            <Box bgGradient="linear(to-r, purple.700, purple.900)" px={5} py={4}>
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="lg" fontWeight="700" color="white">📤 அழைப்பை பகிர்</Text>
                  <Text fontSize="xs" color="purple.200">Share Invite — Choose platform</Text>
                </Box>
                <Box as="button" onClick={() => setShowShareModal(false)}
                  color="whiteAlpha.600" fontSize="xl">✕</Box>
              </HStack>
            </Box>
            <VStack spacing={3} px={5} py={5}>
              <Button w="100%" h="52px" bg="#25D366" color="white" fontSize="md" fontWeight="700"
                borderRadius="xl" onClick={() => handleShare('whatsapp')} _hover={{ bg: '#1da851' }}>
                📱 WhatsApp
              </Button>
              <Button w="100%" h="52px" bg="#0088cc" color="white" fontSize="md" fontWeight="700"
                borderRadius="xl" onClick={() => handleShare('telegram')} _hover={{ bg: '#0077b5' }}>
                ✈️ Telegram
              </Button>
              <Button w="100%" h="52px" bg="#1877F2" color="white" fontSize="md" fontWeight="700"
                borderRadius="xl" onClick={() => handleShare('facebook')} _hover={{ bg: '#1465d0' }}>
                📘 Facebook
              </Button>
              <Button w="100%" h="52px"
                bgGradient="linear(to-r, #833ab4, #fd1d1d, #fcb045)"
                color="white" fontSize="md" fontWeight="700" borderRadius="xl"
                onClick={() => handleShare('instagram')} _hover={{ opacity: 0.9 }}>
                📸 Instagram (Copy + Open)
              </Button>
              {shareData.shareEmail && (
                <Button w="100%" h="52px" bg="purple.600" color="white" fontSize="md" fontWeight="700"
                  borderRadius="xl" onClick={() => handleShare('email')} _hover={{ bg: 'purple.700' }}>
                  📧 Email
                </Button>
              )}
              <Button w="100%" h="52px"
                bg={copied ? 'green.600' : 'whiteAlpha.200'}
                color="white" fontSize="md" fontWeight="700" borderRadius="xl"
                onClick={() => handleShare('copy')} _hover={{ bg: copied ? 'green.600' : 'whiteAlpha.300' }}>
                {copied ? '✅ நகலெடுக்கப்பட்டது! / Copied!' : '📋 செய்தியை நகலெடு / Copy Message'}
              </Button>
              {shareData.imageUrl && (
                <Box bg="blue.900" border="1px solid" borderColor="blue.500" borderRadius="xl" px={4} py={3} w="100%">
                  <Text fontSize="xs" color="blue.200" fontWeight="700">📎 படம் பதிவிறக்கம் ஆனது</Text>
                  <Text fontSize="xs" color="blue.300">Tree image downloaded — attach it via 📎 in WhatsApp</Text>
                </Box>
              )}
            </VStack>
          </Box>
        </Box>
      )}
    </>
  );
}
