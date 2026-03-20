import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, VStack, HStack, Text, Heading, Button, Avatar, SimpleGrid } from '@chakra-ui/react';
import api from '../services/api';

const sectionBox = { w: '100%', bg: 'whiteAlpha.100', border: '1px solid', borderColor: 'whiteAlpha.200', borderRadius: '2xl', px: { base: 5, md: 8 }, py: { base: 4, md: 5 } };

export default function Quiz() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [todayScore, setTodayScore] = useState(null);
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/api/quiz/today').then(res => {
      if (res.data.already_played) { setAlreadyPlayed(true); setTodayScore(res.data.today_score); setStreak(res.data.streak); }
      else setQuestions(res.data.questions || []);
    }).finally(() => setLoading(false));
    api.get('/api/quiz/leaderboard').then(res => setLeaderboard(res.data.leaderboard || []));
  }, []);

  const handleSelect = (option) => { if (selected) return; setSelected(option); };

  const handleNext = () => {
    if (!selected) return;
    const newAnswers = [...answers, { question_id: currentQ, answer: selected }];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ + 1 < questions.length) setCurrentQ(currentQ + 1);
    else submitQuiz(newAnswers);
  };

  const submitQuiz = async (finalAnswers) => {
    setSubmitting(true);
    try {
      const res = await api.post('/api/quiz/submit', { answers: finalAnswers, questions });
      setQuizResult(res.data); setShowResult(true);
      api.get('/api/quiz/leaderboard').then(r => setLeaderboard(r.data.leaderboard || []));
    } catch (e) {} finally { setSubmitting(false); }
  };

  const getOptionStyle = (option) => {
    if (!selected) return { bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.200' };
    if (option === questions[currentQ]?.correct_answer) return { bg: 'green.800', borderColor: 'green.400' };
    if (option === selected) return { bg: 'red.800', borderColor: 'red.400' };
    return { bg: 'whiteAlpha.50', borderColor: 'whiteAlpha.100' };
  };

  if (loading) return <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" display="flex" alignItems="center" justifyContent="center"><VStack><Text fontSize="4xl">🧠</Text><Text color="whiteAlpha.600">ஏற்றுகிறோம்...</Text></VStack></Box>;

  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)" px={{ base: 4, md: 8 }} py={6} pb={24}>
      <VStack w="100%" maxW="900px" mx="auto" spacing={4} align="stretch">

        <Box {...sectionBox}>
          <HStack justify="space-between">
            <HStack spacing={3}>
              <Box as="button" onClick={() => navigate('/dashboard')} color="whiteAlpha.600" fontSize="xl" _hover={{ color: 'white' }}>←</Box>
              <Box>
                <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white">🧠 வினாடி வினா</Heading>
                <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">Daily Family Quiz</Text>
              </Box>
            </HStack>
            {streak > 0 && <HStack bg="orange.800" borderRadius="full" px={3} py={1}><Text fontSize="sm" color="orange.200">🔥 {streak}</Text></HStack>}
          </HStack>
        </Box>

        {/* Already played */}
        {alreadyPlayed && !showResult && (
          <>
            <Box {...sectionBox} textAlign="center">
              <Text fontSize="5xl" mb={3}>{todayScore === 5 ? '🏆' : todayScore >= 3 ? '🌟' : '💪'}</Text>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white" mb={2}>இன்று விளையாடியாயிற்று!</Heading>
              <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight="800" color="purple.300">{todayScore}/5</Text>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.500">இன்றைய மதிப்பெண் / Today's score</Text>
              {streak > 1 && <HStack justify="center" mt={3}><Text fontSize="2xl">🔥</Text><Text fontWeight="700" color="orange.300">{streak} நாள் தொடர்ச்சி!</Text></HStack>}
              <Text fontSize="sm" color="whiteAlpha.400" mt={4}>நாளை மீண்டும் வாருங்கள் / Come back tomorrow!</Text>
            </Box>
            {leaderboard.length > 0 && (
              <Box {...sectionBox}>
                <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white" mb={3}>🏆 இந்த வார சாம்பியன்கள்</Text>
                <VStack spacing={2} align="stretch">
                  {leaderboard.map((e, i) => (
                    <HStack key={e.user?.id} bg="whiteAlpha.100" borderRadius="xl" px={4} py={3} justify="space-between">
                      <HStack spacing={3}>
                        <Text fontSize="lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</Text>
                        <Avatar size="sm" name={e.user?.name} src={e.user?.profile_photo} />
                        <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="600" color="white">{e.user?.name}</Text>
                      </HStack>
                      <Text fontWeight="700" color="purple.300">{e.total_score} pts</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
            <Box bgGradient="linear(to-r, purple.700, green.700)" borderRadius="2xl" px={{ base: 5, md: 8 }} py={5} textAlign="center">
              <Text fontSize="3xl" mb={2}>🎁</Text>
              <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" color="white">பரிசுகள் வரும்! / Rewards Coming Soon!</Text>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.600" mt={1}>தினமும் விளையாடி பரிசு வெல்லுங்கள்!</Text>
            </Box>
          </>
        )}

        {/* Quiz in progress */}
        {!alreadyPlayed && !showResult && questions.length > 0 && (
          <>
            <Box {...sectionBox} py={3}>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color="whiteAlpha.600">கேள்வி {currentQ + 1} / {questions.length}</Text>
              </HStack>
              <Box w="100%" bg="whiteAlpha.200" borderRadius="full" h="6px">
                <Box bg="purple.400" borderRadius="full" h="6px" w={`${((currentQ) / questions.length) * 100}%`} transition="all 0.3s" />
              </Box>
            </Box>

            <Box {...sectionBox}>
              <VStack spacing={5} align="stretch">
                <Text fontSize="xs" color="purple.300" fontWeight="600">
                  {questions[currentQ]?.type === 'photo_name' ? '📷 புகைப்படம்' : questions[currentQ]?.type === 'tamil_word' ? '📚 தமிழ் சொல்' : '🌳 உறவு'}
                </Text>
                {questions[currentQ]?.photo && (
                  <HStack justify="center">
                    <Avatar size="2xl" src={questions[currentQ].photo} border="4px solid" borderColor="purple.400" />
                  </HStack>
                )}
                <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" color="white" textAlign="center">
                  {questions[currentQ]?.question}
                </Text>
                <VStack spacing={2} align="stretch">
                  {questions[currentQ]?.options?.map((option, i) => (
                    <Box key={i} as="button" onClick={() => handleSelect(option)}
                      border="1px solid" borderRadius="xl" px={4} py={3}
                      textAlign="left" transition="all 0.2s" cursor={selected ? 'default' : 'pointer'}
                      {...getOptionStyle(option)}
                    >
                      <Text fontSize={{ base: 'sm', md: 'md' }} color="white">
                        <Text as="span" color="whiteAlpha.500" mr={2}>{['A','B','C','D'][i]}.</Text>
                        {option}
                        {selected && option === questions[currentQ]?.correct_answer && ' ✓'}
                        {selected && option === selected && option !== questions[currentQ]?.correct_answer && ' ✗'}
                      </Text>
                    </Box>
                  ))}
                </VStack>
                {selected && (
                  <Box bg={selected === questions[currentQ]?.correct_answer ? 'green.900' : 'red.900'} borderRadius="xl" px={4} py={3} textAlign="center">
                    <Text color={selected === questions[currentQ]?.correct_answer ? 'green.200' : 'red.200'} fontSize={{ base: 'sm', md: 'md' }}>
                      {selected === questions[currentQ]?.correct_answer ? '✅ சரியான பதில்! / Correct!' : `❌ தவறு! சரி: ${questions[currentQ]?.correct_answer}`}
                    </Text>
                  </Box>
                )}
                <Button w="100%" h={{ base: '50px', md: '56px' }} bgGradient="linear(to-r, purple.600, green.500)" color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl"
                  isDisabled={!selected} isLoading={submitting}
                  onClick={handleNext}
                  _hover={{ transform: 'translateY(-2px)' }} _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}>
                  {currentQ + 1 === questions.length ? '🏁 முடிக்கவும்' : 'அடுத்தது →'}
                </Button>
              </VStack>
            </Box>
          </>
        )}

        {/* Result */}
        {showResult && quizResult && (
          <>
            <Box {...sectionBox} textAlign="center">
              <Text fontSize="5xl" mb={3}>{quizResult.score === 5 ? '🏆' : quizResult.score >= 3 ? '🌟' : '💪'}</Text>
              <Heading fontSize={{ base: 'xl', md: '2xl' }} color="white" mb={2}>{quizResult.score === 5 ? 'அருமை! 🎉' : 'நல்ல முயற்சி!'}</Heading>
              <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight="800" color="purple.300">{quizResult.score}/{quizResult.total}</Text>
              {quizResult.streak > 1 && <HStack justify="center" mt={3}><Text fontSize="2xl">🔥</Text><Text fontWeight="700" color="orange.300">{quizResult.streak} நாள் தொடர்ச்சி!</Text></HStack>}
              <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.600" mt={3}>{quizResult.message}</Text>
            </Box>
            <Button w="100%" maxW="900px" mx="auto" h={{ base: '50px', md: '56px' }} bgGradient="linear(to-r, purple.600, green.500)" color="white" fontSize={{ base: 'md', md: 'lg' }} fontWeight="700" borderRadius="xl" onClick={() => navigate('/dashboard')}>
              ← Dashboard-க்கு திரும்பு
            </Button>
          </>
        )}

        {!alreadyPlayed && !showResult && questions.length === 0 && !loading && (
          <Box {...sectionBox} textAlign="center" py={10}>
            <Text fontSize="4xl" mb={3}>🌱</Text>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="whiteAlpha.600">வினாடி வினா தயார் இல்லை</Text>
            <Text fontSize={{ base: 'sm', md: 'md' }} color="whiteAlpha.400">குடும்பத்தினரை சேர்த்து சரிபார்க்கவும்</Text>
          </Box>
        )}

      </VStack>
    </Box>
  );
}
