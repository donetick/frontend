import LogoSVG from '@/assets/logo.svg'
import { Email, GitHub } from '@mui/icons-material'
import {
  Box,
  Container,
  Divider,
  Grid,
  IconButton,
  Link,
  Typography,
} from '@mui/joy'
import { version } from '../../../package.json'
import DiscordIcon from '../../components/icons/DiscordIcon'
import RedditIcon from '../../components/icons/RedditIcon'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Demo', href: '#demo' },
      { label: 'Getting Started', href: '#getting-started' },
    ],
    resources: [
      { label: 'Documentation', href: 'https://docs.donetick.com/' },
      {
        label: 'API Reference',
        href: 'https://docs.donetick.com/advance-settings/api',
      },
      {
        label: 'Discussions',
        href: 'https://github.com/donetick/donetick/discussions',
      },
      { label: 'Roadmap', href: 'https://github.com/orgs/donetick/projects/3' },
    ],
    downloads: [
      {
        label: 'GitHub Release',
        href: 'https://github.com/donetick/donetick/releases',
      },
      {
        label: 'Docker Hub',
        href: 'https://hub.docker.com/r/donetick/donetick',
      },
      {
        label: 'Home Assistant',
        href: 'https://github.com/donetick/hassio-addons',
      },
      { label: 'Source Code', href: 'https://github.com/donetick/donetick' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      {
        label: 'License',
        href: 'https://github.com/donetick/donetick/blob/main/LICENSE',
      },
      {
        label: 'Changelog',
        href: 'https://github.com/donetick/donetick/releases',
      },
    ],
  }

  const socialLinks = [
    {
      icon: <GitHub />,
      href: 'https://github.com/donetick/donetick',
      label: 'GitHub',
    },
    {
      icon: <DiscordIcon />,
      href: 'https://discord.gg/6hSH6F33q7',
      label: 'Discord',
    },
    {
      icon: <RedditIcon />,
      href: 'https://reddit.com/r/donetick',
      label: 'Reddit',
    },
    { icon: <Email />, href: 'mailto:support@donetick.com', label: 'Email' },
  ]

  return (
    <Box
      component='footer'
      sx={{
        background: 'background.surface',
        borderTop: '1px solid',
        borderColor: 'divider',
        py: { xs: 6, md: 8 },
        mt: 8,
      }}
    >
      <Container maxWidth='xl'>
        {/* Main Footer Content */}
        <Grid container spacing={4} mb={6}>
          {/* Brand Section */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <img
                  src={LogoSVG}
                  alt='Donetick Logo'
                  width='48px'
                  height='48px'
                />
                <Typography
                  level='h4'
                  sx={{
                    ml: 2,
                    fontWeight: 700,
                    fontSize: 28,
                    color: 'text.primary',
                  }}
                >
                  Done<span style={{ color: '#06b6d4' }}>tick</span>
                </Typography>
              </Box>
              <Typography
                level='body-md'
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.6,
                  mb: 4,
                  maxWidth: 300,
                }}
              >
                Open-source task management made simple. Organize your life,
                collaborate with your team, and stay on top of everything that
                matters.
              </Typography>

              {/* Social Links */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {socialLinks.map((social, index) => (
                  <IconButton
                    key={index}
                    component='a'
                    href={social.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    variant='soft'
                    sx={{
                      color: 'text.secondary',
                      background: 'background.level1',
                      '&:hover': {
                        color: 'primary.500',
                        background: 'primary.50',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                    aria-label={social.label}
                  >
                    {social.icon}
                  </IconButton>
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Footer Links */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={4}>
              <Grid item xs={6} sm={3}>
                <Typography
                  level='title-md'
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: 3,
                  }}
                >
                  Product
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {footerLinks.product.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        fontSize: 14,
                        '&:hover': {
                          color: 'primary.500',
                        },
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography
                  level='title-md'
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: 3,
                  }}
                >
                  Resources
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {footerLinks.resources.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      target='_blank'
                      rel='noopener noreferrer'
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        fontSize: 14,
                        '&:hover': {
                          color: 'primary.500',
                        },
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography
                  level='title-md'
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: 3,
                  }}
                >
                  Downloads
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {footerLinks.downloads.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      target='_blank'
                      rel='noopener noreferrer'
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        fontSize: 14,
                        '&:hover': {
                          color: 'primary.500',
                        },
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography
                  level='title-md'
                  sx={{
                    color: 'text.primary',
                    fontWeight: 600,
                    mb: 3,
                  }}
                >
                  Legal
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {footerLinks.legal.map((link, index) => (
                    <Link
                      key={index}
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : '_self'}
                      rel={
                        link.href.startsWith('http')
                          ? 'noopener noreferrer'
                          : undefined
                      }
                      sx={{
                        color: 'text.secondary',
                        textDecoration: 'none',
                        fontSize: 14,
                        '&:hover': {
                          color: 'primary.500',
                        },
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'divider', mb: 4 }} />

        {/* Bottom Section */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography
            level='body-sm'
            sx={{
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            © {currentYear} Donetick. All rights reserved.
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              Version {version}
            </Typography>
            <Typography
              level='body-sm'
              sx={{
                color: 'primary.500',
                fontWeight: 600,
                px: 2,
                py: 0.5,
                borderRadius: 8,
                background: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.200',
              }}
            >
              100% Open Source
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default Footer
