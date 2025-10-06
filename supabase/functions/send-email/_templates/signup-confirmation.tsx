import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface SignupConfirmationEmailProps {
  confirmation_url: string
}

export const SignupConfirmationEmail = ({
  confirmation_url,
}: SignupConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to A La Carte Chat - Confirm your email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Welcome to A La Carte Chat</Heading>
          <Text style={subtitle}>Your All-in-One Customer Communication Platform</Text>
        </Section>
        
        <Section style={content}>
          <Text style={text}>
            Thank you for signing up! We're excited to have you on board.
          </Text>
          
          <Text style={text}>
            To get started with A La Carte Chat and access your dashboard, please confirm your email address by clicking the button below:
          </Text>
          
          <Section style={buttonContainer}>
            <Link
              href={confirmation_url}
              target="_blank"
              style={button}
            >
              Confirm Email Address
            </Link>
          </Section>
          
          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={linkText}>{confirmation_url}</Text>
          
          <Section style={featureSection}>
            <Text style={featureTitle}>What you can do with A La Carte Chat:</Text>
            <Text style={featureItem}>✓ Manage WhatsApp, Email & SMS in one place</Text>
            <Text style={featureItem}>✓ AI-powered responses for faster support</Text>
            <Text style={featureItem}>✓ Team collaboration tools</Text>
            <Text style={featureItem}>✓ Advanced analytics & reporting</Text>
          </Section>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            If you didn't create an account with A La Carte Chat, you can safely ignore this email.
          </Text>
          <Text style={footerText}>
            © {new Date().getFullYear()} A La Carte Chat. All rights reserved.
          </Text>
          <Text style={footerText}>
            Need help? Contact us at support@alacartechat.com
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupConfirmationEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  padding: '0',
}

const subtitle = {
  color: '#ffffff',
  fontSize: '16px',
  margin: '0',
  opacity: 0.9,
}

const content = {
  padding: '0 40px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#667eea',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const linkText = {
  color: '#667eea',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
  margin: '8px 0 24px',
}

const featureSection = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
}

const featureTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
}

const featureItem = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
}

const footer = {
  padding: '32px 40px 0',
  borderTop: '1px solid #eaeaea',
  margin: '32px 0 0',
}

const footerText = {
  color: '#666',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '8px 0',
  textAlign: 'center' as const,
}
