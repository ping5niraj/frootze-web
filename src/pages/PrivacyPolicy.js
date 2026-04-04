import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Divider,
  Badge,
} from '@chakra-ui/react';

const Section = ({ title, children }) => (
  <Box mb={6}>
    <Heading size="md" mb={3} color="green.600">
      {title}
    </Heading>
    {children}
    <Divider mt={4} />
  </Box>
);

const PrivacyPolicy = () => {
  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="3xl" bg="white" borderRadius="lg" p={8} boxShadow="md">
        <VStack align="start" spacing={2} mb={8}>
          <Heading size="xl" color="green.700">
            Privacy Policy
          </Heading>
          <Text color="gray.500" fontSize="sm">
            frootze — Tamil Family Tree App
          </Text>
          <Badge colorScheme="green">Last updated: April 2026</Badge>
        </VStack>

        <Section title="1. Introduction">
          <Text color="gray.700" lineHeight="tall">
            Welcome to frootze ("we", "our", or "us"). frootze is a Tamil family
            tree application that helps families build, explore, and share their
            family networks. This Privacy Policy explains how we collect, use,
            and protect your personal information when you use our app and
            website at frootze.com.
          </Text>
        </Section>

        <Section title="2. Information We Collect">
          <VStack align="start" spacing={3}>
            <Text color="gray.700" fontWeight="semibold">
              Personal Information:
            </Text>
            <Text color="gray.700" lineHeight="tall">
              • <strong>Name</strong> — used to identify you in your family tree{'\n'}
              • <strong>Phone number</strong> — used for OTP authentication and
              family connection{'\n'}
              • <strong>Email address</strong> — optional, used for
              notifications{'\n'}
              • <strong>Date of birth</strong> — optional, used for birthday
              reminders{'\n'}
              • <strong>Gender</strong> — used to display correct Tamil
              relationship labels{'\n'}
              • <strong>Profile photo</strong> — optional, displayed in your
              family tree node{'\n'}
              • <strong>Location (GPS)</strong> — only when you choose to share
              your location with family members{'\n'}
              • <strong>District and Pincode</strong> — optional, used for
              family directory filters
            </Text>
          </VStack>
        </Section>

        <Section title="3. How We Use Your Information">
          <Text color="gray.700" lineHeight="tall">
            We use your information solely to provide frootze services:{'\n\n'}
            • Build and display your family tree{'\n'}
            • Send OTP verification codes for secure login{'\n'}
            • Show Tamil relationship labels (Appa, Amma, Thatha, Paati, etc.){'\n'}
            • Enable family messaging and location sharing{'\n'}
            • Send birthday reminders and family notifications{'\n'}
            • Display family directory with Kutham and district filters{'\n'}
            • Improve app performance and fix bugs
          </Text>
        </Section>

        <Section title="4. Data Sharing">
          <Text color="gray.700" lineHeight="tall">
            We do <strong>not</strong> sell, rent, or share your personal data
            with any third parties for commercial purposes.{'\n\n'}
            Your data may be shared only in these limited circumstances:{'\n'}
            • With verified family members you have connected with on frootze{'\n'}
            • With Firebase (Google) for phone authentication (OTP){'\n'}
            • With Supabase for secure database storage{'\n'}
            • With Cloudflare R2 for profile photo storage{'\n'}
            • With legal authorities if required by law
          </Text>
        </Section>

        <Section title="5. Data Security">
          <Text color="gray.700" lineHeight="tall">
            We take data security seriously:{'\n\n'}
            • All data is transmitted over HTTPS (encrypted in transit){'\n'}
            • Phone numbers are never displayed to other users{'\n'}
            • Profile details are only visible to verified family members{'\n'}
            • Firebase Authentication is used for secure OTP login{'\n'}
            • We do not store OTP codes — Firebase handles this securely
          </Text>
        </Section>

        <Section title="6. Child Safety Standards">
          <Box
            bg="green.50"
            border="1px solid"
            borderColor="green.200"
            borderRadius="md"
            p={4}
          >
            <Text color="gray.700" lineHeight="tall">
              frootze is committed to the safety and protection of children.
              We have a zero-tolerance policy for any content that exploits,
              harms, or endangers children.{'\n\n'}
              <strong>Our child safety commitments:</strong>{'\n\n'}
              • frootze does not permit direct registration by children under 13
              years of age{'\n'}
              • Minor children (under 18) can only be added as offline/non-registered
              nodes by adult family members{'\n'}
              • We do not knowingly collect personal data directly from children
              under 13{'\n'}
              • Adult family members are responsible for the accuracy and
              appropriateness of information added for minors{'\n'}
              • Users can report any child safety concern by emailing
              support@nalamini.com{'\n'}
              • We comply with all applicable child safety and data protection
              laws including POCSO and IT Act provisions in India{'\n'}
              • We cooperate fully with regional and national authorities on
              child safety matters{'\n'}
              • Any content found to exploit or endanger children will be
              removed immediately and reported to authorities
            </Text>
          </Box>
        </Section>

        <Section title="7. Account Deletion">
          <Text color="gray.700" lineHeight="tall">
            You have the right to request deletion of your account and all
            associated data at any time.{'\n\n'}
            To request account deletion:{'\n'}
            • Email us at <strong>support@nalamini.com</strong> with subject
            "Delete my frootze account"{'\n'}
            • Include your registered phone number{'\n'}
            • We will delete your account and all personal data within 30 days{'\n\n'}
            Note: Family tree connections where other members have added you
            may retain your name as a historical reference unless you request
            full removal.
          </Text>
        </Section>

        <Section title="8. Your Rights">
          <Text color="gray.700" lineHeight="tall">
            You have the right to:{'\n\n'}
            • Access the personal data we hold about you{'\n'}
            • Correct inaccurate data{'\n'}
            • Request deletion of your data{'\n'}
            • Withdraw consent for location sharing at any time{'\n'}
            • Opt out of notifications
          </Text>
        </Section>

        <Section title="9. Changes to This Policy">
          <Text color="gray.700" lineHeight="tall">
            We may update this Privacy Policy from time to time. We will notify
            you of significant changes via the app or email. Continued use of
            frootze after changes constitutes acceptance of the updated policy.
          </Text>
        </Section>

        <Section title="10. Contact Us">
          <Text color="gray.700" lineHeight="tall">
            For any privacy concerns, data requests, or child safety reports:{'\n\n'}
            📧 Email: <strong>support@nalamini.com</strong>{'\n'}
            🌐 Website: <strong>frootze.com</strong>{'\n'}
            📍 Operated by Nalamini, Tamil Nadu, India
          </Text>
        </Section>

        <Box mt={4} p={4} bg="gray.100" borderRadius="md">
          <Text color="gray.500" fontSize="sm" textAlign="center">
            © 2026 frootze. All rights reserved. | frootze.com/privacy
          </Text>
        </Box>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;
