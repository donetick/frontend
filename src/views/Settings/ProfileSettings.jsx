import {
  Avatar,
  Box,
  Button,
  Card,
  Divider,
  Snackbar,
  Typography,
} from '@mui/joy'
import Modal from '@mui/joy/Modal'
import ModalDialog from '@mui/joy/ModalDialog'
import { useContext, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { UserContext } from '../../contexts/UserContext'
import { resolvePhotoURL } from '../../utils/Helpers'
import { getCroppedImg } from '../../utils/imageCropUtils'
import { UploadFile } from '../../utils/TokenManager'

const ProfileSettings = () => {
  const { userProfile, setUserProfile } = useContext(UserContext)
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '')
  const [photoURL, setPhotoURL] = useState(userProfile?.image || '')
  const [isUploading, setIsUploading] = useState(false)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    color: 'success',
  })
  const fileInputRef = useRef()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showCropper, setShowCropper] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

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
        320,
        320,
        'image/jpeg',
      )
      const formData = new FormData()
      formData.append('file', croppedBlob, 'profile.jpg')
      const response = await UploadFile('/users/profile_photo', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      const url = resolvePhotoURL(data.url || data.sign)

      setPhotoURL(url)
      setUserProfile({ ...userProfile, image: url })
      setSnackbar({
        open: true,
        message: 'Profile photo updated!',
        color: 'success',
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to upload photo.',
        color: 'danger',
      })
    } finally {
      setIsUploading(false)
      setShowCropper(false)
      setSelectedFile(null)
    }
  }

  const handleSave = () => {
    setUserProfile({ ...userProfile, displayName })
    setSnackbar({
      open: true,
      message: 'Profile updated!',
      color: 'success',
    })
  }

  // Helper to resolve photoURL with baseURL if needed

  return (
    <div className='grid gap-4 py-4' id='profile'>
      <Typography level='h3'>Profile Settings</Typography>
      <Divider />
      <Typography level='body-md'>
        Update your display name and profile photo.
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
            Change Photo
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
              Save
            </Button>
            <Button
              onClick={() => {
                setShowCropper(false)
                setSelectedFile(null)
              }}
              variant='soft'
              color='neutral'
            >
              Cancel
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
      {/* <Box sx={{ maxWidth: 400 }}>
        <Typography level='body-sm' sx={{ mb: 0.5 }}>
          Display Name
        </Typography>
        <Input
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder='Enter your display name'
          sx={{ mb: 2 }}
        />
        <Button
          variant='soft'
          color='primary'
          onClick={handleSave}
          sx={{ width: 120 }}
        >
          Save
        </Button>
      </Box> */}
      <Snackbar
        open={snackbar.open}
        color={snackbar.color}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        {snackbar.message}
      </Snackbar>
    </div>
  )
}

export default ProfileSettings
