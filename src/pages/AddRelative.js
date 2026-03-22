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

  // ── Generate simple tree image ──
  const generateTreeImage = async () => {
    try {
      const res = await api.get('/api/relationships/mine');
      const members = res.data.my_relationships || [];
      const canvas = document.createElement('canvas');
      const W = 800; const HEADER = 90; const FOOTER = 70; const ROW_H = 100;
      const NODE_W = 110; const NODE_H = 75;
      const genMap = { 'past-2': [], 'past-1': [], 'current': [], 'future-1': [] };
      const GEN_FOR = {
        grandfather_paternal: 'past-2', grandmother_paternal: 'past-2',
        grandfather_maternal: 'past-2', grandmother_maternal: 'past-2',
        father: 'past-1', mother: 'past-1',
        brother: 'current', sister: 'current', spouse: 'current',
        son: 'future-1', daughter: 'future-1',
      };
      members.forEach(m => { const g = GEN_FOR[m.relation_type]; if (g) genMap[g].push(m); });
      const activeGens = Object.values(genMap).filter(a => a.length > 0).length;
      canvas.width = W;
      canvas.height = HEADER + FOOTER + (activeGens + 1) * ROW_H + ROW_H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f0c29'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const grad = ctx.createLinearGradient(0, 0, W, HEADER);
      grad.addColorStop(0, '#7C3AED'); grad.addColorStop(1, '#5B21B6');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, HEADER);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
      ctx.fillText('🌳 frootze — குடும்ப மரம்', W / 2, 35);
      ctx.font = '16px Arial'; ctx.fillStyle = '#DDD6FE';
      ctx.fillText(`${user?.name}'s Family Tree · ${members.length} members`, W / 2, 65);
      const drawNode = (x, y, name, label, isYou) => {
        ctx.fillStyle = isYou ? '#7C3AED' : '#2D2B5E';
        ctx.beginPath(); ctx.roundRect(x - NODE_W/2, y - NODE_H/2, NODE_W, NODE_H, 10); ctx.fill();
        ctx.strokeStyle = isYou ? '#A78BFA' : '#4C4A8A'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = isYou ? '#5B21B6' : '#3D3B7E';
        ctx.beginPath(); ctx.arc(x, y - NODE_H/2 + 18, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        ctx.fillText((name||'?').charAt(0).toUpperCase(), x, y - NODE_H/2 + 22);
        ctx.font = 'bold 8px Arial'; ctx.fillStyle = '#C4B5FD';
        ctx.fillText(label||'', x, y - NODE_H/2 + 40);
        const dn = (name||'').length > 10 ? (name||'').substring(0,10)+'…' : (name||'');
        ctx.font = '8px Arial'; ctx.fillStyle = '#E0E0E0';
        ctx.fillText(dn, x, y - NODE_H/2 + 54);
      };
      let rowY = HEADER + ROW_H;
      const youX = W / 2 - 65;
      ['past-2','past-1','current','future-1'].forEach(genKey => {
        const nodes = genMap[genKey];
        if (nodes.length === 0 && genKey !== 'current') return;
        if (genKey === 'current') {
          drawNode(youX, rowY, user?.name, 'நீங்கள்', true);
          nodes.filter(n => n.relation_type === 'spouse').forEach((n,i) => {
            drawNode(youX + NODE_W + 15, rowY, n.to_user?.name || n.offline_name, n.relation_tamil, false);
          });
          nodes.filter(n => ['brother','sister'].includes(n.relation_type)).forEach((n,i) => {
            drawNode(youX - (NODE_W+15)*(i+1), rowY, n.to_user?.name || n.offline_name, n.relation_tamil, false);
          });
        } else {
          const total = nodes.length;
          const startX = W/2 - (total * NODE_W + (total-1)*15)/2 + NODE_W/2;
          nodes.forEach((n,i) => drawNode(startX + i*(NODE_W+15), rowY, n.to_user?.name || n.offline_name, n.relation_tamil, false));
        }
        rowY += ROW_H;
      });
      ctx.fillStyle = '#1a1740'; ctx.fillRect(0, canvas.height - FOOTER, W, FOOTER);
      ctx.fillStyle = '#7C3AED'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
      ctx.fillText('Join our family tree: www.frootze.com', W/2, canvas.height - FOOTER + 28);
      ctx.fillStyle = '#A78BFA'; ctx.font = '12px Arial';
      ctx.fillText('Build your family tree free — frootze.com 🌳', W/2, canvas.height - FOOTER + 50);
      return canvas.toDataURL('image/png');
    } catch (e) { console.error('Tree gen failed:', e); return null; }
  };

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
