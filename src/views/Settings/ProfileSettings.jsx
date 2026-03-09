import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  Input,
  Typography,
} from '@mui/joy'
import Modal from '@mui/joy/Modal'
import ModalDialog from '@mui/joy/ModalDialog'
import { useQueryClient } from '@tanstack/react-query'
import imageCompression from 'browser-image-compression'
import { useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import { UpdateUserDetails } from '../../utils/Fetcher'
import { resolvePhotoURL } from '../../utils/Helpers'
import { getCroppedImg } from '../../utils/imageCropUtils'
import SettingsLayout from './SettingsLayout'

const ProfileSettings = () => {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const { data: userProfile } = useUserProfile()
  const { showSuccess, showError } = useNotification()
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [timezone, setTimezone] = useState(
    userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [photoURL, setPhotoURL] = useState(userProfile?.image || '')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  // Get available timezones
  const timezones = Intl.supportedValuesOf('timeZone')

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handlePhotoChange = e => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(URL.createObjectURL(file))
    setShowCropper(true)
  }

  const handleCropSave = async () => {
    setIsUploading(true)
    try {
      const croppedBlob = await getCroppedImg(
        selectedFile,
        croppedAreaPixels,
        160,
        160,
        'image/jpeg',
      )

      // Compress the cropped image
      const compressionOptions = {
        maxSizeMB: 0.02, // Smaller size for profile images
        maxWidthOrHeight: 160, // Match the cropped dimensions
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.8,
      }

      const compressedFile = await imageCompression(
        croppedBlob,
        compressionOptions,
      )

      console.log(`Original size: ${(croppedBlob.size / 1024).toFixed(2)} KB`)
      console.log(
        `Compressed size: ${(compressedFile.size / 1024).toFixed(2)} KB`,
      )

      const formData = new FormData()
      formData.append('file', compressedFile, 'profile.jpg')
      const response = await apiClient.upload('/users/profile_photo', formData)
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      const url = resolvePhotoURL(data.url || data.sign)

      setPhotoURL(url)
      showSuccess({
        title: t('profile.photoUpdated'),
        message: t('profile.photoUpdatedMessage'),
      })
    } catch (err) {
      showError({
        title: t('profile.uploadFailed'),
        message: t('profile.uploadFailedMessage'),
      })
    } finally {
      setIsUploading(false)
      setShowCropper(false)
      setSelectedFile(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const userDetails = { displayName, timezone }
      const response = await UpdateUserDetails(userDetails)
      // invalidate user profile cache here if using react-query or similar:
      queryClient.invalidateQueries(['userProfile'])
      queryClient.refetchQueries(['userProfile'])

      if (response.ok) {
        showSuccess({
          title: t('profile.profileUpdated'),
          message: t('profile.profileUpdatedMessage'),
        })
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (err) {
      console.log(err)

      showError({
        title: t('profile.updateFailed'),
        message: t('profile.updateFailedMessage'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Helper to resolve photoURL with baseURL if needed

  return (
    <SettingsLayout title={t('profile.title')}>
      <div className='grid gap-4 py-4' id='profile'>
        <Typography level='body-md'>
          {t('profile.description')}
        </Typography>
        <Card
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            maxWidth: 400,
          }}
        >
          <Avatar src={photoURL} sx={{ width: 64, height: 64 }} />
          <Box sx={{ flex: 1 }}>
            <Button
              variant='soft'
              color='primary'
              onClick={() => fileInputRef.current.click()}
              loading={isUploading}
              sx={{ mb: 1 }}
            >
              {t('profile.changePhoto')}
            </Button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </Box>
        </Card>
        <Modal
          open={showCropper}
          onClose={() => {
            setShowCropper(false)
            setSelectedFile(null)
          }}
        >
          <ModalDialog
            layout='center'
            sx={{
              width: 360,
              maxWidth: '90vw',
              bgcolor: '#fff',
              borderRadius: 2,
              boxShadow: 24,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 420,
            }}
          >
            <Box sx={{ width: 320, height: 320, position: 'relative', mt: 2 }}>
              <Cropper
                image={selectedFile}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape='round'
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                width: '100%',
                p: 2,
                mt: 2,
              }}
            >
              <Button
                onClick={handleCropSave}
                loading={isUploading}
                variant='solid'
                color='primary'
                size='md'
                sx={{ mr: 1 }}
              >
                {t('profile.save')}
              </Button>
              <Button
                onClick={() => {
                  setShowCropper(false)
                  setSelectedFile(null)
                }}
                variant='soft'
                color='neutral'
              >
                {t('profile.cancel')}
              </Button>
            </Box>
          </ModalDialog>
        </Modal>
        <Box sx={{ maxWidth: 400, mt: 3 }}>
          <Typography level='body-sm' sx={{ mb: 0.5 }}>
            {t('profile.displayName')}
          </Typography>
          <Input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={t('profile.displayNamePlaceholder')}
            sx={{ mb: 2 }}
          />

          <Typography level='body-sm' sx={{ mb: 0.5 }}>
            {t('profile.timezone')}
          </Typography>
          <Autocomplete
            value={timezone}
            onChange={(e, newValue) => setTimezone(newValue)}
            options={timezones}
            getOptionLabel={tz => {
              const formattedTimezone = tz.replace(/_/g, ' ')
              const currentTime = new Date().toLocaleString('en-US', {
                timeZone: tz,
                timeStyle: 'short',
              })
              return `${formattedTimezone} (${currentTime})`
            }}
            filterOptions={(options, { inputValue }) => {
              if (!inputValue) return options

              const searchTerms = inputValue.toLowerCase().split(/\s+/)
              return options.filter(tz => {
                const timezoneLower = tz.toLowerCase()
                const timezoneParts = tz.toLowerCase().split(/[/_]/)

                return searchTerms.every(
                  term =>
                    timezoneLower.includes(term) ||
                    timezoneParts.some(part => part.includes(term)),
                )
              })
            }}
            placeholder={t('profile.timezonePlaceholder')}
            sx={{ mb: 2 }}
          />

          <Button
            variant='soft'
            color='primary'
            onClick={handleSave}
            loading={isSaving}
            sx={{ width: 120 }}
          >
            {t('profile.save')}
          </Button>
        </Box>
      </div>
    </SettingsLayout>
  )
}

export default ProfileSettings
