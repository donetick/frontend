import imageCompression from 'browser-image-compression'
import { useCallback } from 'react'

import { useUserProfile } from '../queries/UserQueries'
import { useNotification } from '../service/NotificationProvider'
import { apiClient } from '../utils/ApiClient'
import { isPlusAccount, resolvePhotoURL } from '../utils/Helpers'

export const useFileUpload = ({
  draftId,
  entityId,
  entityType = 'chore_attachment',
} = {}) => {
  const { showError } = useNotification()
  const { data: userProfile } = useUserProfile()

  const uploadFile = useCallback(
    async file => {
      if (!isPlusAccount(userProfile)) {
        showError({
          title: 'Plus Feature',
          message:
            'Image uploads are not available in the Basic plan. Upgrade to Plus to add images to your content.',
        })
        return null
      }

      try {
        const compressionOptions = {
          maxSizeMB: entityType === 'profile' ? 0.5 : 1,
          maxWidthOrHeight: entityType === 'profile' ? 320 : 1200,
          useWebWorker: true,
          fileType: 'image/jpeg',
        }

        const compressedFile = await imageCompression(file, compressionOptions)
        const compressedJpegFile = new File(
          [compressedFile],
          `${file.name.split('.')[0]}.jpg`,
          { type: 'image/jpeg' },
        )

        const formData = new FormData()
        formData.append('file', compressedJpegFile)
        formData.append('entityType', entityType)
        if (entityId) formData.append('entityId', String(entityId))
        if (draftId) formData.append('draftId', draftId)

        const response = await apiClient.upload('/assets/chore', formData)

        if (response.status === 507) {
          showError({
            title: 'Storage Quota Exceeded',
            message: 'You have exceeded your quota for uploading files.',
          })
          return null
        } else if (response.status === 413) {
          showError({
            title: 'File Too Large',
            message: 'The file you are trying to upload is too large.',
          })
          return null
        } else if (response.status === 403 && !isPlusAccount(userProfile)) {
          showError({
            title: 'Upgrade Required',
            message: 'Image uploads are only available for Plus accounts.',
          })
          return null
        } else if (response.status === 403) {
          showError({
            title: 'Permission Denied',
            message: 'You do not have permission to upload files.',
          })
          return null
        } else if (!response.ok) {
          showError({
            title: 'Upload Failed',
            message: 'Failed to upload image.',
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
          message: 'An error occurred while processing the image.',
        })
        return null
      }
    },
    [entityType, entityId, draftId, showError, userProfile],
  )

  return { uploadFile, isPlus: isPlusAccount(userProfile) }
}
