import imageCompression from 'browser-image-compression'
import { useCallback } from 'react'

import { useUserProfile } from '../queries/UserQueries'
import { useNotification } from '../service/NotificationProvider'
import { apiClient } from '../utils/ApiClient'
import { isPlusAccount, resolvePhotoURL } from '../utils/Helpers'
import { useTranslation } from 'react-i18next'

export const useFileUpload = ({
  draftId,
  entityId,
  entityType = 'chore_attachment',
} = {}) => {
  const { t } = useTranslation('common')
  const { showError } = useNotification()
  const { data: userProfile } = useUserProfile()

  const uploadFile = useCallback(
    async file => {
      if (!isPlusAccount(userProfile)) {
        showError({
          title: 'Plus Feature',
          message:
            'File uploads are not available in the Basic plan. Upgrade to Plus to add files to your content.',
        })
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
          showError({
            title: 'Upgrade Required',
            message: 'File uploads are only available for Plus accounts.',
          })
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
    [entityType, entityId, draftId, showError, userProfile, t],
  )

  return { uploadFile, isPlus: isPlusAccount(userProfile) }
}
