import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, VStack, HStack, Text, Heading, Avatar, Button, SimpleGrid } from '@chakra-ui/react';
import api from '../services/api';

const TAMIL_MONTHS = ['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];
const sectionBox = { w: '100%', bg: 'white', border: '1.5px solid', borderColor: 'purple.100', borderRadius: '2xl', px: { base: 5, md: 8 }, py: { base: 4, md: 5 } };

export default function Birthdays() {
  const navigate = useNavigate();
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [allBirthdays, setAllBirthdays] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/birthdays').then(res => {
      setTodayBirthdays(res.data.today || []);
      setUpcomingBirthdays(res.data.upcoming || []);
      setAllBirthdays(res.data.all || []);
      if (res.data.today?.length > 0) setActiveTab('today');
    }).finally(() => setLoading(false));
  }, []);

  const wishOnWhatsApp = (b) => {
    const msg = encodeURIComponent(`🎂 பிறந்தநாள் வாழ்த்துகள் ${b.name}! 🎉\nHappy ${b.age}th Birthday! 🎈\n- frootze குடும்பம் 🌳`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <Box minH="100vh" w="100vw" bg="#f5f3ff" px={{ base: 4, md: 10, lg: 16 }} py={6} pb={24}>
      <VStack w="100%" maxW="1200px" mx="auto" spacing={4} align="stretch">

        {/* Sticky Top Bar */}
        <Box position="sticky" top={0} zIndex={100}
          bg="white" borderBottom="1px solid" borderColor="purple.100"
          boxShadow="0 2px 8px rgba(124,58,237,0.08)"
          px={4} py={3} mx={{ base: -4, md: -10, lg: -16 }} mb={4}>
          <HStack maxW="1200px" mx="auto" justify="space-between">
            <HStack spacing={3}>
              <Box as="button" onClick={() => navigate('/dashboard')}
                w="36px" h="36px" borderRadius="xl"
                bg="purple.50" border="1px solid" borderColor="purple.200"
                display="flex" alignItems="center" justifyContent="center"
                color="purple.600" fontSize="16px" fontWeight="bold"
                _hover={{ bg: 'purple.100' }}>←</Box>
              <Box>
                <Text fontSize="16px" fontWeight="800" color="purple.900">🎂 பிறந்தநாள்</Text>
                <Text fontSize="11px" color="gray.400">Birthday Calendar</Text>
              </Box>
            </HStack>
            <HStack spacing={1}><Box w="7px" h="7px" borderRadius="full" bg="purple.400" /><Text fontSize="12px" color="purple.400" fontWeight="700">frootze</Text></HStack>
          </HStack>
        </Box>
        <Box {...sectionBox}>
          <HStack spacing={3}>
            <Box as="button" onClick={() => navigate('/dashboard')} color="gray.500" fontSize="xl" _hover={{ color: 'purple.900' }}>←</Box>
            <Box>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="purple.900">🎂 பிறந்தநாள் நாட்காட்டி</Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.500">Birthday Calendar</Text>
            </Box>
          </HStack>
        </Box>

        {/* Today's birthdays */}
        {todayBirthdays.length > 0 && todayBirthdays.map(b => (
          <Box key={b.id} bgGradient="linear(135deg, #7C3AED, #059669)" border="none" borderRadius="2xl" px={{ base: 5, md: 8 }} py={5}>
            <HStack justify="space-between" mb={3}>
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="purple.900">🎉 இன்று பிறந்தநாள்!</Text>
              <Text fontSize="2xl">🎂</Text>
            </HStack>
            <HStack spacing={3} mb={4}>
              <Avatar size="lg" name={b.name} src={b.profile_photo} border="3px solid white" />
              <Box>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="700" color="purple.900">{b.name}</Text>
                <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.600">{b.relation_tamil} · {b.age} வயது</Text>
              </Box>
            </HStack>
            <Button w="100%" bg="white" color="purple.700" fontWeight="700" borderRadius="xl" onClick={() => wishOnWhatsApp(b)}
              _hover={{ bg: 'whiteAlpha.900' }}>
              💬 WhatsApp-ல் வாழ்த்துங்கள்
            </Button>
          </Box>
        ))}

        {/* Tabs */}
        <Box {...sectionBox} py={3}>
          <HStack bg="white" borderRadius="xl" p={1}>
            {[{key:'upcoming',label:`🔔 வரும் (${upcomingBirthdays.length})`},{key:'all',label:'📅 அனைத்தும்'}].map(t => (
              <Button key={t.key} flex={1} size="sm"
                bg={activeTab === t.key ? 'purple.600' : 'white'}
                color={activeTab === t.key ? 'white' : 'purple.500'}
                borderRadius="lg" onClick={() => setActiveTab(t.key)}
                _hover={{ bg: activeTab === t.key ? 'purple.700' : 'purple.50' }}
              >{t.label}</Button>
            ))}
          </HStack>
        </Box>

        <Box {...sectionBox}>
          {loading ? <Text color="gray.500" textAlign="center" py={4}>ஏற்றுகிறோம்...</Text> :
           (activeTab === 'upcoming' ? upcomingBirthdays : allBirthdays).length === 0 ? (
            <VStack py={8} spacing={2}>
              <Text fontSize="3xl">🎂</Text>
              <Text color="gray.500" textAlign="center">பிறந்தநாள் இல்லை / No birthdays found</Text>
            </VStack>
          ) : (
            <VStack spacing={3} align="stretch">
              {(activeTab === 'upcoming' ? upcomingBirthdays : allBirthdays).map(b => {
                const dob = new Date(b.date_of_birth);
                return (
                  <HStack key={b.id} bg="white" borderRadius="xl" px={4} py={3} justify="space-between">
                    <HStack spacing={3}>
                      <Avatar size="md" name={b.name} src={b.profile_photo} border="2px solid" borderColor="purple.400" />
                      <Box>
                        <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="700" color="purple.900">{b.name}</Text>
                        <Text fontSize="xs" color="gray.500">{b.relation_tamil}</Text>
                        <Text fontSize="xs" color="gray.400">{dob.getDate()} {TAMIL_MONTHS[dob.getMonth()]}
                          {b.days_until === 0 ? '' : b.days_until === 1 ? ' · நாளை!' : ` · ${b.days_until} நாட்களில்`}
                        </Text>
                      </Box>
                    </HStack>
                    {b.is_today && (
                      <Button size="sm" bg="white" color="purple.700" borderRadius="xl" onClick={() => wishOnWhatsApp(b)}>
                        💬 Wish
                      </Button>
                    )}
                  </HStack>
                );
              })}
            </VStack>
          )}
        </Box>

      </VStack>
    </Box>
  );
}
