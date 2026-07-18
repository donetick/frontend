import imageCompression from 'browser-image-compression'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import QuillMarkdown from 'quilljs-markdown'

// Extend the built-in Image blot to preserve dt-data-path
const ImageBlot = Quill.import('formats/image')
class DtImageBlot extends ImageBlot {
  static create(value) {
    const node = super.create(typeof value === 'string' ? value : value.src)
    if (value?.path) node.setAttribute('dt-data-path', value.path)
    return node
  }
  static value(node) {
    return {
      src: node.getAttribute('src'),
      path: node.getAttribute('dt-data-path'),
    }
  }
  static formats(node) {
    return { 'dt-data-path': node.getAttribute('dt-data-path') }
  }
  format(name, value) {
    if (name === 'dt-data-path') {
      if (value) this.domNode.setAttribute('dt-data-path', value)
      else this.domNode.removeAttribute('dt-data-path')
    } else {
      super.format(name, value)
    }
  }
}
DtImageBlot.blotName = 'image'
DtImageBlot.tagName = 'img'
Quill.register(DtImageBlot, true)
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { useDescriptionHtml } from '../../hooks/useDescriptionHtml'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import { apiClient } from '../../utils/ApiClient'
import { isPlusAccount, resolvePhotoURL } from '../../utils/Helpers'
import { patchDescriptionHtml } from '../../utils/ImageCache'
import './RichTextEditor.css'

const RichTextEditor = forwardRef(
  (
    {
      value = '',
      onChange,
      isEditable = true,
      placeholder = 'Enter description...',
      variant = 'outlined',
      entityId,
      entityType,
      draftId,
    },
    ref,
  ) => {
    const { showError } = useNotification()
    const { data: userProfile } = useUserProfile()
    // Display-only HTML with expired image srcs swapped for cached/re-signed ones
    const displayHtml = useDescriptionHtml(value)
    const quillRef = useRef(null)
    const editorRef = useRef(null)
    const initialContentSet = useRef(false)

    // Expose focus method to parent components
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (editorRef.current) {
            editorRef.current.focus()
          }
        },
        blur: () => {
          if (editorRef.current) {
            editorRef.current.blur()
          }
        },
      }),
      [],
    )

    // Image upload handler - wrapped in useCallback to avoid recreating on every render
    const handleImageUpload = useCallback(() => {
      // Check if user has plus account
      if (!isPlusAccount(userProfile)) {
        showError({
          title: 'Plus Feature',
          message:
            'Image uploads are not available in the Basic plan. Upgrade to Plus to add images to your content.',
        })
        return
      }

      const input = document.createElement('input')
      input.setAttribute('type', 'file')
      input.setAttribute('accept', 'image/*')
      input.click()
      input.onchange = async () => {
        const file = input.files[0]
        if (!file) return

        try {
          // Define compression options based on entity type ( this need a revist later)
          const compressionOptions = {
            maxSizeMB: entityType === 'profile' ? 0.5 : 1, // Smaller size for profile images
            maxWidthOrHeight: entityType === 'profile' ? 320 : 1200, // Smaller dimensions for profile images
            useWebWorker: true,
            fileType: 'image/jpeg',
          }

          // Compress the image
          const compressedFile = await imageCompression(
            file,
            compressionOptions,
          )

          // Create new file with .jpg extension to ensure it's treated as JPEG
          const compressedJpegFile = new File(
            [compressedFile],
            `${file.name.split('.')[0]}.jpg`,
            { type: 'image/jpeg' },
          )

          console.log(
            `Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
          )
          console.log(
            `Compressed size: ${(compressedJpegFile.size / 1024 / 1024).toFixed(2)} MB`,
          )

          // Upload compressed image to backend. Without a saved entity yet,
          // upload as a draft tied to draftId — the backend promotes drafts
          // to the real entity when the chore is created.
          const formData = new FormData()
          formData.append('file', compressedJpegFile)
          if (entityId) {
            formData.append('entityId', String(entityId))
            formData.append('entityType', entityType)
          } else if (draftId) {
            formData.append('entityType', `${entityType}_draft`)
            formData.append('draftId', draftId)
          } else {
            formData.append('entityType', entityType)
          }

          const response = await apiClient.upload('/assets/chore', formData)

          if (response.status === 507) {
            showError({
              title: 'Storage Quota Exceeded',
              message: 'You have exceeded your quota for uploading files.',
            })
            return
          } else if (response.status === 413) {
            showError({
              title: 'File Too Large',
              message: 'The file you are trying to upload is too large.',
            })
            return
          } else if (response.status === 403 && !isPlusAccount(userProfile)) {
            showError({
              title: 'Upgrade Required',
              message:
                'Image uploads are only available for Plus accounts. Please ',
            })
            return
          } else if (response.status === 403) {
            showError({
              title: 'Permission Denied',
              message: 'You do not have permission to upload files.',
            })
            return
          } else if (!response.ok) {
            showError({
              title: 'Upload Failed',
              message: 'Failed to upload image.',
            })
            return
          }
          const data = await response.json()
          // data.sign is a fetchable signed URL; data.path is the stable
          // storage key kept in dt-data-path so the src can be re-signed
          // after the URL expires.
          const path = data.path
          const url = resolvePhotoURL(data.sign || data.url)
          // Insert image into Quill with dt-data-path tracked by the custom blot
          const quill = editorRef.current
          const range = quill.getSelection()
          const insertIndex = range ? range.index : 0
          quill.insertEmbed(insertIndex, 'image', { src: url, path })
        } catch (error) {
          console.error('Error during image processing or upload:', error)
          showError({
            title: 'Upload Failed',
            message: 'An error occurred while processing the image.',
          })
        }
      }
    }, [entityId, entityType, draftId, showError, userProfile]) // Dependencies for useCallback

    useEffect(() => {
      if (!quillRef.current) return
      if (!editorRef.current && isEditable) {
        editorRef.current = new Quill(quillRef.current, {
          theme: variant === 'bubble' ? 'bubble' : 'snow',
          modules: {
            toolbar: {
              container: [
                [{ header: [1, 2, 3, 4, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link', 'image'],
                ['clean'],
              ],
              handlers: {
                image: handleImageUpload,
              },
            },
          },
          placeholder: placeholder,
        })
        new QuillMarkdown(editorRef.current, {})
        editorRef.current.root.innerHTML = value
        editorRef.current.on('text-change', () => {
          if (onChange) {
            onChange(editorRef.current.root.innerHTML)
          }
        })
      }
      // Keep Quill's editing state in sync with the isEditable prop
      if (editorRef.current) {
        editorRef.current.enable(isEditable)
      }
    }, [onChange, value, isEditable, variant, handleImageUpload, userProfile]) // Added handleImageUpload and userProfile to dependency array

    useEffect(() => {
      if (editorRef.current && isEditable) {
        if (editorRef.current.root.innerHTML !== value) {
          editorRef.current.root.innerHTML = value || ''
          // On first load, swap expired image srcs for cached/re-signed ones
          if (!initialContentSet.current && value) {
            patchDescriptionHtml(value).then(html => {
              if (editorRef.current && html !== value) {
                editorRef.current.root.innerHTML = html
              }
            })
          }
          initialContentSet.current = true
        }
      }
    }, [value, isEditable])

    if (!isEditable) {
      // Display-only mode: render HTML
      return (
        <div
          className='editor-view-mode'
          style={{
            minHeight: 120,
            overflow: 'scroll',
            //   border:
            //     '1px solid var(--joy-palette-neutral-outlinedBorder, #DDE7EE)',
            borderRadius: 8,
            padding: 16,
            background: 'var(--joy-palette-background-surface, #fff)',
            color: 'var(--joy-palette-text-primary, #1A2027)',
            fontFamily:
              'var(--joy-fontFamily-body, Inter, system-ui, Avenir, Helvetica, Arial, sans-serif)',
            fontSize: 16,
            boxShadow:
              'var(--joy-shadow-xs, 0px 1px 2px 0px rgba(16, 24, 40, 0.05))',
          }}
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      )
    }

    return (
      <div className={`quill-root quill-variant-${variant}`}>
        <div
          ref={quillRef}
          style={{
            minHeight: 120,
            background: 'var(--joy-palette-background-surface, #fff)',
          }}
        />
      </div>
    )
  },
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor
