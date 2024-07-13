import LogoSVG from '@/assets/logo.svg'
import { Card, Grid } from '@mui/joy'
import Box from '@mui/joy/Box'
import Link from '@mui/joy/Link'
import Typography from '@mui/joy/Typography'
import * as React from 'react'

function Footer() {
  return (
    <Card
      data-aos-landing-footer
      data-aos-delay={200}
      data-aos-anchor='[data-aos-landing-footer]'
      data-aos='zoom-in-up'
    >
      <Grid
        container
        component='footer'
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          p: 4,
          // borderTop: '1px solid',
          bottom: 0,
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <div className='logo'>
            <img src={LogoSVG} alt='logo' width='64px' height='64px' />
          </div>
          <Box className='flex items-center gap-2'>
            <Typography
              level='title-lg'
              sx={{
                fontWeight: 700,
                fontSize: 24,
              }}
            >
              Done
              <span
                style={{
                  color: '#06b6d4',
                  fontWeight: 600,
                }}
              >
                tick✓
              </span>
            </Typography>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                position: 'relative',
                top: 12,
                right: 45,
              }}
            >
              Beta
            </span>
          </Box>
        </Box>
        <Box>
          <Typography level='body2' fontWeight='bold' mb={1}>
            Github
          </Typography>
          <Link
            href='https://github.com/donetick/core'
            level='body2'
            sx={{ display: 'block' }}
          >
            Core(Backend)
          </Link>
          <Link
            href='https://github.com/donetick/frontend'
            level='body2'
            sx={{ display: 'block' }}
          >
            Frontend
          </Link>
          <Link
            href='https://github.com/donetick/hassio-addons'
            level='body2'
            sx={{ display: 'block' }}
          >
            Home Assistant Addon
          </Link>
          <Link
            href='https://github.com/orgs/Donetick/packages'
            level='body2'
            sx={{ display: 'block' }}
          >
            Packages
          </Link>
        </Box>
        <Box>
          <Typography level='body2' fontWeight='bold' mb={1}>
            Links
          </Typography>

          <Link disabled={true} level='body2' sx={{ display: 'block' }}>
            Roadmap(soon)
          </Link>
          <Link disabled={true} level='body2' sx={{ display: 'block' }}>
            Documentation(soon)
          </Link>
          <Link disabled={true} level='body2' sx={{ display: 'block' }}>
            Changelog(soon)
          </Link>
        </Box>
        {/* <Box>
        <Typography level='body2' fontWeight='bold' mb={1}>
          Others
        </Typography>
        <Link href='#' level='body2' sx={{ display: 'block' }}>
          Telegram Integration
        </Link>
        <Link href='#' level='body2' sx={{ display: 'block' }}>
          Slash Commands
        </Link>
      </Box> */}
      </Grid>
    </Card>
  )
}

export default Footer
