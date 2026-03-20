import { Box, HStack, Text, IconButton } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function PageLayout({ title, subtitle, onBack, children }) {
  const navigate = useNavigate();

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" py={6} px={{ base: 4, md: 8 }}>

      {/* Header */}
      <Box
        w="100%" maxW="900px" mx="auto"
        bg="whiteAlpha.100" border="1px solid" borderColor="whiteAlpha.200"
        borderRadius="2xl" px={{ base: 4, md: 6 }} py={4} mb={4}
      >
        <HStack spacing={4}>
          <Box
            as="button"
            onClick={() => onBack ? onBack() : navigate('/dashboard')}
            color="whiteAlpha.600"
            fontSize="xl"
            _hover={{ color: 'white' }}
            transition="all 0.2s"
          >
            ←
          </Box>
          <Box>
            <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="700" color="white">{title}</Text>
            {subtitle && <Text fontSize="xs" color="whiteAlpha.500">{subtitle}</Text>}
          </Box>
        </HStack>
      </Box>

      {/* Content */}
      <Box w="100%" maxW="900px" mx="auto">
        {children}
      </Box>

    </Box>
  );
}
