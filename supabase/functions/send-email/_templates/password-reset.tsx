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
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  reset_url: string
}

export const PasswordResetEmail = ({
  reset_url,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your A La Carte Chat password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Password Reset Request</Heading>
          <Text style={subtitle}>A La Carte Chat</Text>
        </Section>
        
        <Section style={content}>
          <Text style={text}>
            We received a request to reset your password for your A La Carte Chat account.
          </Text>
          
          <Text style={text}>
            Click the button below to create a new password:
          </Text>
          
          <Section style={buttonContainer}>
            <Link
              href={reset_url}
              target="_blank"
              style={button}
            >
              Reset Password
            </Link>
          </Section>
          
          <Text style={text}>
            Or copy and paste this link into your browser:
          </Text>
          <Text style={linkText}>{reset_url}</Text>
          
          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ This link will expire in 60 minutes for security reasons.
            </Text>
          </Section>
        </Section>
        
        <Section style={footer}>
          <Text style={footerText}>
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
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

export default PasswordResetEmail

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

const warningBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  padding: '16px',
  margin: '24px 0',
  borderRadius: '4px',
}

const warningText = {
  color: '#856404',
  fontSize: '14px',
  margin: '0',
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
