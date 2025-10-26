import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface TwoFactorCodeProps {
  code: string;
  email: string;
}

export const TwoFactorCode = ({
  code,
  email,
}: TwoFactorCodeProps) => (
  <Html>
    <Head />
    <Preview>Your 2FA verification code for À La Carte Chat</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Two-Factor Authentication</Heading>
        <Text style={text}>
          Use the verification code below to complete your sign in:
        </Text>
        <Section style={codeContainer}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={text}>
          This code will expire in 10 minutes for security reasons.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't attempt to sign in, please secure your account immediately.
        </Text>
        <Text style={footer}>
          Account email: <strong>{email}</strong>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default TwoFactorCode;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 24px',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
};

const codeContainer = {
  textAlign: 'center' as const,
  margin: '40px 0',
};

const codeText = {
  backgroundColor: '#f4f4f5',
  border: '2px solid #ea384c',
  borderRadius: '8px',
  color: '#1a1a1a',
  display: 'inline-block',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '8px',
  padding: '20px 32px',
  fontFamily: 'monospace',
};

const hr = {
  border: 'none',
  borderTop: '1px solid #e4e4e7',
  margin: '32px 0',
};

const footer = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};
