/**
 * AdCard.js — Business Agent Ad Display
 * C:\Projects\PingMyFamily\web\src\components\AdCard.js
 *
 * Renders a single ad in the family feed.
 * Shows: agent avatar, sponsored label, media, caption, CTA buttons
 */

import { Box, HStack, VStack, Text, Avatar, Button, Badge } from '@chakra-ui/react';

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days  > 0) return `${days} நாள் முன்பு`;
  if (hours > 0) return `${hours} மணி முன்பு`;
  return 'இப்போது';
}

const AD_TYPE_LABEL = {
  broadcast: '📢 அனைவருக்கும்',
  group:     '🏮 குதம் விளம்பரம்',
  personal:  '👤 தனிப்பட்ட',
};

export default function AdCard({ ad }) {
  if (!ad) return null;

  const handleWhatsApp = () => {
    if (!ad.whatsapp_number) return;
    const digits = ad.whatsapp_number.replace(/\D/g, '');
    const msg = encodeURIComponent(`நான் frootze-ல் உங்கள் விளம்பரம் பார்த்தேன். ${ad.caption || ''}`);
    window.open(`https://wa.me/${digits}?text=${msg}`, '_blank');
  };

  const handleCTA = () => {
    if (!ad.cta_url) return;
    window.open(ad.cta_url, '_blank');
  };

  return (
    <Box
      bg="linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%)"
      border="1.5px solid"
      borderColor="purple.200"
      borderRadius="2xl"
      overflow="hidden"
      boxShadow="0 2px 12px rgba(124,58,237,0.08)"
    >
      {/* Sponsored header */}
      <HStack
        bg="purple.50"
        borderBottom="1px solid"
        borderColor="purple.100"
        px={4} py={2}
        justify="space-between"
      >
        <HStack spacing={2}>
          <Avatar
            size="sm"
            name={ad.posted_by_user?.name}
            src={ad.posted_by_user?.profile_photo}
            border="2px solid"
            borderColor="purple.300"
          />
          <VStack spacing={0} align="flex-start">
            <Text fontSize="13px" fontWeight="700" color="purple.800">
              {ad.posted_by_user?.name}
            </Text>
            <HStack spacing={1}>
              <Badge colorScheme="purple" fontSize="9px" borderRadius="full" px={2}>
                🏢 Business Agent
              </Badge>
              <Text fontSize="10px" color="purple.400">• Sponsored</Text>
            </HStack>
          </VStack>
        </HStack>
        <HStack spacing={2}>
          <Badge
            colorScheme="purple"
            fontSize="9px"
            borderRadius="full"
            px={2}
            variant="outline"
          >
            {AD_TYPE_LABEL[ad.ad_type] || 'விளம்பரம்'}
          </Badge>
          <Text fontSize="10px" color="purple.300">{timeAgo(ad.created_at)}</Text>
        </HStack>
      </HStack>

      {/* Media */}
      {ad.media_url && (
        <Box bg="gray.100" maxH="380px" overflow="hidden">
          {ad.media_type === 'video' ? (
            <video
              src={ad.media_url}
              controls
              style={{ width: '100%', maxHeight: '380px', display: 'block', objectFit: 'cover' }}
            />
          ) : (
            <img
              src={ad.media_url}
              alt="ad"
              style={{ width: '100%', maxHeight: '380px', objectFit: 'cover', display: 'block' }}
            />
          )}
        </Box>
      )}

      {/* Caption + CTA */}
      <VStack align="stretch" spacing={3} px={4} py={4}>
        {ad.caption && (
          <Text fontSize="14px" color="gray.700" lineHeight="1.6">
            {ad.caption}
          </Text>
        )}

        {/* CTA Buttons */}
        {(ad.cta_url || ad.whatsapp_number) && (
          <HStack spacing={3} flexWrap="wrap">
            {ad.cta_url && (
              <Button
                size="sm"
                bg="purple.600"
                color="white"
                borderRadius="xl"
                fontWeight="700"
                _hover={{ bg: 'purple.700' }}
                onClick={handleCTA}
                flex={1}
              >
                {ad.cta_text || 'மேலும் அறிய / Learn More'}
              </Button>
            )}
            {ad.whatsapp_number && (
              <Button
                size="sm"
                bg="#25D366"
                color="white"
                borderRadius="xl"
                fontWeight="700"
                _hover={{ bg: '#128C7E' }}
                onClick={handleWhatsApp}
                flex={1}
              >
                💬 WhatsApp
              </Button>
            )}
          </HStack>
        )}
      </VStack>
    </Box>
  );
}
