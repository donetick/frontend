import imageCompression from 'browser-image-compression'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { PAYWALL_REASON, usePaywall } from '../contexts/PaywallContext'
import { useUserProfile } from '../queries/UserQueries'
import { useNotification } from '../service/NotificationProvider'
import { apiClient } from '../utils/ApiClient'
import { isPlusAccount, resolvePhotoURL } from '../utils/Helpers'

export const useFileUpload = ({
  draftId,
  entityId,
  entityType = 'chore_attachment',
} = {}) => {
  const { t } = useTranslation('common')
  const { showError } = useNotification()
  const { data: userProfile } = useUserProfile()
  const { showPaywall } = usePaywall()

  const uploadFile = useCallback(
    async file => {
      // The upgrade pitch belongs in the paywall modal, not in an error toast
      // the user can only dismiss.
      if (!isPlusAccount(userProfile)) {
        showPaywall(PAYWALL_REASON.FILE_UPLOAD)
        return null
      }

      try {
        // Only images go through compression — anything else (PDFs, docs)
        // would be destroyed by re-encoding it as a JPEG.
        let fileToUpload = file
        if (file.type?.startsWith('image/')) {
          const compressionOptions = {
            maxSizeMB: entityType === 'profile' ? 0.5 : 1,
            maxWidthOrHeight: entityType === 'profile' ? 320 : 1200,
            useWebWorker: true,
            fileType: 'image/jpeg',
          }

          const compressedFile = await imageCompression(
            file,
            compressionOptions,
          )
          fileToUpload = new File(
            [compressedFile],
            `${file.name.split('.')[0]}.jpg`,
            { type: 'image/jpeg' },
          )
        }

        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('entityType', entityType)
        if (entityId) formData.append('entityId', String(entityId))
        if (draftId) formData.append('draftId', draftId)

        const response = await apiClient.upload('/assets/chore', formData)

        if (response.status === 507) {
          showError({
            title: t('upload.quotaTitle'),
            message: t('upload.quotaMessage'),
          })
          return null
        } else if (response.status === 413) {
          showError({
            title: t('upload.tooLargeTitle'),
            message: t('upload.tooLargeMessage'),
          })
          return null
        } else if (response.status === 403 && !isPlusAccount(userProfile)) {
          // The server reached the same verdict the click-time gate did —
          // usually a plan that changed under us. Same wall, same modal.
          showPaywall(PAYWALL_REASON.FILE_UPLOAD)
          return null
        } else if (response.status === 403) {
          showError({
            title: t('upload.deniedTitle'),
            message: t('upload.deniedMessage'),
          })
          return null
        } else if (!response.ok) {
          showError({
            title: 'Upload Failed',
            message: 'Failed to upload file.',
          })
          return null
        }

        const data = await response.json()
        // url is fetchable now; path is the stable storage key used to
        // re-sign, delete, and cache the file later.
        return {
          url: resolvePhotoURL(data.sign || data.url),
          path: data.path,
          fileName: data.file_name || file.name,
          sizeBytes: data.size_bytes,
        }
      } catch {
        showError({
          title: 'Upload Failed',
          message: 'An error occurred while processing the file.',
        })
        return null
      }
    },
    [entityType, entityId, draftId, showError, showPaywall, userProfile, t],
  )

  return { uploadFile, isPlus: isPlusAccount(userProfile) }
}
