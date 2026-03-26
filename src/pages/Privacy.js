import { Box, VStack, Heading, Text } from '@chakra-ui/react';

export default function Privacy() {
  return (
    <Box minH="100vh" w="100vw" bgGradient="linear(to-b, #0f0c29, #1e1b4b)"
      px={{ base: 6, md: 16 }} py={12}>
      <VStack maxW="800px" mx="auto" align="stretch" spacing={8}>

        <Box>
          <Heading fontSize={{ base: '2xl', md: '4xl' }} color="white">
            🌳 frootze — Privacy Policy
          </Heading>
          <Text color="whiteAlpha.500" fontSize="sm" mt={2}>
            Last updated: March 2026
          </Text>
        </Box>

        {[
          {
            title: '1. Information We Collect',
            content: [
              'Phone number — for OTP verification and account identity',
              'Full name and gender — for family tree display',
              'Date of birth — optional, used for birthday feature',
              'Profile photo — stored securely on Cloudflare R2',
              'Family relationship data — shared only with verified family members',
              'Location (district/city) — optional, only if user enables it',
            ]
          },
          {
            title: '2. How We Use Your Information',
            content: [
              'To create and manage your frootze account',
              'To build and display your family tree',
              'To send OTP verification messages via MSG91',
              'To match you with family members who share the same relationships',
              'To display upcoming birthdays within your family network',
            ]
          },
          {
            title: '3. What We Do NOT Do',
            content: [
              'We do not sell your personal data to any third party',
              'We do not share your phone number with other users',
              'We do not share your data with advertisers',
              'We do not store your data beyond what is necessary for the service',
            ]
          },
          {
            title: '4. Data Storage',
            content: [
              'All data is stored securely on Supabase (PostgreSQL)',
              'Profile photos are stored on Cloudflare R2 object storage',
              'Data is not stored on your device beyond app session cache',
              'All data transfers are encrypted via HTTPS',
            ]
          },
          {
            title: '5. Family Relationship Data',
            content: [
              'Relationship data is only visible to verified family members',
              'Unverified connections can see your name only',
              'You can delete your account and all associated data at any time by contacting support@frootze.com',
            ]
          },
          {
            title: '6. Children\'s Privacy',
            content: [
              'frootze is not directed at children under 13',
              'We do not knowingly collect data from children under 13',
              'If you believe a child has provided us data, contact us immediately',
            ]
          },
          {
            title: '7. Contact Us',
            content: [
              'Email: support@frootze.com',
              'Website: frootze.com',
              'For data deletion requests, email us with subject: "Delete My Account"',
            ]
          },
          {
            title: '8. Changes to This Policy',
            content: [
              'We may update this policy periodically',
              'Changes will be posted on this page with an updated date',
              'Continued use of frootze after changes means you accept the new policy',
            ]
          },
        ].map((section, i) => (
          <Box key={i} bg="whiteAlpha.100" borderRadius="2xl" px={6} py={5}
            border="1px solid" borderColor="whiteAlpha.200">
            <Heading fontSize="lg" color="purple.300" mb={3}>{section.title}</Heading>
            <VStack align="stretch" spacing={2}>
              {section.content.map((item, j) => (
                <Text key={j} color="whiteAlpha.800" fontSize="sm">
                  • {item}
                </Text>
              ))}
            </VStack>
          </Box>
        ))}

        <Box bg="purple.900" borderRadius="2xl" px={6} py={5}
          border="1px solid" borderColor="purple.600">
          <Text color="purple.200" fontSize="sm" textAlign="center">
            frootze — உங்கள் குடும்பம், உங்கள் வேர்கள்
            {'\n'}Your Family, Your Roots
            {'\n\n'}support@frootze.com · frootze.com
          </Text>
        </Box>

      </VStack>
    </Box>
  );
}
