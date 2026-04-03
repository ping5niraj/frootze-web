import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, HStack, Text, Button, VStack } from '@chakra-ui/react';
import api from '../services/api';

export default function SuggestionsBanner() {
  const navigate = useNavigate();
  const [count, setCount]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pmf_suggestions_dismissed') === 'true'
  );

  useEffect(() => {
    if (dismissed) { setLoading(false); return; }
    api.get('/api/relationships/suggestions')
      .then(res => {
        setCount(res.data.suggestions?.length || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dismissed]);

  if (loading || dismissed || count === 0) return null;

  return (
    <Box bg="purple.900" border="1px solid" borderColor="purple.500"
      borderRadius="2xl" px={5} py={4}
      borderLeftWidth="4px" borderLeftColor="purple.400">
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Text fontSize="sm" fontWeight="700" color="purple.200">
            🌳 {count} குடும்பத்தினர் கண்டறியப்பட்டனர்!
          </Text>
          <Text fontSize="xs" color="whiteAlpha.500">
            உங்கள் தொடர்புகள் மூலம் கண்டறியப்பட்டது
          </Text>
        </VStack>
        <HStack spacing={2}>
          <Button size="sm" bgGradient="linear(to-r, purple.600, green.500)"
            color="white" borderRadius="xl" fontWeight="700"
            onClick={() => navigate('/family-suggestions')}>
            பார்க்கவும் →
          </Button>
          <Button size="xs" variant="ghost" color="whiteAlpha.400"
            onClick={() => {
              localStorage.setItem('pmf_suggestions_dismissed', 'true');
              setDismissed(true);
            }}>✕</Button>
        </HStack>
      </HStack>
    </Box>
  );
}
