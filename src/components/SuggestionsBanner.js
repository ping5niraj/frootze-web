import { useEffect, useState } from 'react';
import {
  Box, VStack, HStack, Text, Button, Avatar, Badge, Spinner
} from '@chakra-ui/react';
import api from '../services/api';

export default function SuggestionsBanner({ onRelationAdded }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await api.get('/api/suggestions/mine');
      setSuggestions(res.data.suggestions || []);
    } catch (e) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/api/suggestions/${id}/accept`);
      setSuggestions(prev => prev.filter(s => s.id !== id));
      if (onRelationAdded) onRelationAdded();
    } catch (e) {
      console.error('Accept suggestion error:', e);
    } finally {
      setActionLoading('');
    }
  };

  const handleDismiss = async (id) => {
    setActionLoading(id + '_dismiss');
    try {
      await api.post(`/api/suggestions/${id}/dismiss`);
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error('Dismiss suggestion error:', e);
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <Box bg="whiteAlpha.50" borderRadius="2xl" p={4} textAlign="center">
        <Spinner size="sm" color="purple.300" />
      </Box>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <Box
      bg="linear-gradient(135deg, rgba(124,58,237,0.15), rgba(16,185,129,0.1))"
      border="1px solid"
      borderColor="purple.500"
      borderRadius="2xl"
      px={{ base: 4, md: 6 }}
      py={{ base: 4, md: 5 }}
    >
      <HStack mb={3} spacing={2}>
        <Text fontSize="lg">💡</Text>
        <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" color="purple.300">
          குடும்ப பரிந்துரைகள் / Family Suggestions ({suggestions.length})
        </Text>
      </HStack>

      <VStack spacing={3} align="stretch">
        {suggestions.map(s => (
          <Box
            key={s.id}
            bg="whiteAlpha.100"
            borderRadius="xl"
            px={4}
            py={3}
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
              <HStack spacing={3} flex={1}>
                <Avatar
                  size="sm"
                  name={s.suggested_user?.name || s.suggested_name}
                  src={s.suggested_user?.profile_photo}
                />
                <Box>
                  <HStack spacing={2} flexWrap="wrap">
                    <Text fontSize="sm" fontWeight="700" color="white">
                      {s.suggested_user?.name || s.suggested_name}
                    </Text>
                    <Badge
                      colorScheme="purple"
                      borderRadius="full"
                      px={2}
                      fontSize="10px"
                    >
                      {s.relation_tamil}
                    </Badge>
                  </HStack>
                  {s.via_user && (
                    <Text fontSize="xs" color="whiteAlpha.500" mt={0.5}>
                      {s.via_user.name} வழியாக / via {s.via_user.name}
                    </Text>
                  )}
                </Box>
              </HStack>

              <HStack spacing={2}>
                <Button
                  size="xs"
                  colorScheme="green"
                  borderRadius="lg"
                  isLoading={actionLoading === s.id}
                  onClick={() => handleAccept(s.id)}
                >
                  ✓ சேர்
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  color="whiteAlpha.400"
                  borderRadius="lg"
                  isLoading={actionLoading === s.id + '_dismiss'}
                  onClick={() => handleDismiss(s.id)}
                >
                  ✗
                </Button>
              </HStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
