import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface EmailVerificationProps {
  verificationUrl: string;
  email: string;
}

export const EmailVerification = ({
  verificationUrl,
  email,
}: EmailVerificationProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address for À La Carte Chat</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to À La Carte Chat!</Heading>
        <Text style={text}>
          Thank you for signing up. To get started, please verify your email address by clicking the button below:
        </Text>
        <Section style={buttonContainer}>
          <Link
            href={verificationUrl}
            target="_blank"
            style={button}
          >
            Verify Email Address
          </Link>
        </Section>
        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        <Text style={codeText}>
          {verificationUrl}
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't create an account with À La Carte Chat, you can safely ignore this email.
        </Text>
        <Text style={footer}>
          Need help? Contact us at{' '}
          <Link href="mailto:support@alacartechat.com" style={link}>
            support@alacartechat.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default EmailVerification;

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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#ea384c',
  borderRadius: '6px',
  color: '#fff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '1',
  padding: '14px 32px',
  textDecoration: 'none',
};

const codeText = {
  backgroundColor: '#f4f4f5',
  border: '1px solid #e4e4e7',
  borderRadius: '6px',
  color: '#18181b',
  fontSize: '14px',
  padding: '12px',
  wordBreak: 'break-all' as const,
  margin: '0 0 16px',
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

const link = {
  color: '#ea384c',
  textDecoration: 'underline',
};
