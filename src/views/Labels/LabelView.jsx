import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LabelModal from '../Modals/Inputs/LabelModal'

import {
  Type as ListType,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import '@meauxt/react-swipeable-list/dist/styles.css'
import { Add, MoreVert } from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { useUserProfile } from '../../queries/UserQueries'
import { getTextColorFromBackgroundColor } from '../../utils/Colors'
import { DeleteLabel } from '../../utils/Fetcher'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import { useLabels } from './LabelQueries'

const LabelCardContent = ({ label, currentUserId, onToggleActions, t }) => {
  // Check if current user owns this label
  const isOwnedByCurrentUser = label.created_by === currentUserId

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 64,
        width: '100%',
        px: 2,
        py: 1.5,
        bgcolor: 'background.body',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Color Avatar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mr: 2,
          flexShrink: 0,
        }}
      >
        <Avatar
          size='sm'
          sx={{
            width: 32,
            height: 32,
            bgcolor: label.color,
            border: '2px solid',
            borderColor: isOwnedByCurrentUser
              ? 'background.surface'
              : 'warning.300',
            boxShadow: isOwnedByCurrentUser
              ? 'sm'
              : '0 0 0 1px var(--joy-palette-warning-300)',
          }}
        >
          <Typography
            level='body-xs'
            sx={{
              color: getTextColorFromBackgroundColor(label.color),
              fontWeight: 'bold',
              fontSize: 10,
            }}
          >
            {label.name.charAt(0).toUpperCase()}
          </Typography>
        </Avatar>
      </Box>

      {/* Content - Center */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Label Name */}
        <Typography
          level='title-sm'
          sx={{
            fontWeight: 600,
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.25,
          }}
        >
          {label.name}
        </Typography>

        {/* Color Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!isOwnedByCurrentUser && (
            <Chip
              size='sm'
              variant='soft'
              color='warning'
              sx={{
                fontSize: 9,
                height: 16,
                px: 0.5,
                fontWeight: 'md',
              }}
            >
              {t('labelsView:shared')}
            </Chip>
          )}
        </Box>
      </Box>
      <Box>
        {onToggleActions && (
          <IconButton
            color='neutral'
            variant='plain'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              onToggleActions()
            }}
          >
            <MoreVert sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}

const LabelView = () => {
  const { t } = useTranslation(['labelsView', 'common'])
  const { data: labels, isLabelsLoading, isError } = useLabels()
  const { data: userProfile } = useUserProfile()

  const [userLabels, setUserLabels] = useState([])
  const [modalOpen, setModalOpen] = useState(false)

  const [currentLabel, setCurrentLabel] = useState(null)
  const queryClient = useQueryClient()
  const [confirmationModel, setConfirmationModel] = useState({})
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)

  const handleAddLabel = () => {
    setCurrentLabel(null)
    setModalOpen(true)
  }

  const handleEditLabel = label => {
    setCurrentLabel(label)
    setModalOpen(true)
  }

  const handleDeleteClicked = id => {
    setConfirmationModel({
      isOpen: true,
      title: t('labelsView:deleteTitle'),
      message: t('labelsView:deleteMessage'),
      confirmText: t('common:actions.delete'),
      color: 'danger',
      cancelText: t('common:actions.cancel'),
      onClose: confirmed => {
        if (confirmed === true) {
          handleDeleteLabel(id)
        }
        setConfirmationModel({})
      },
    })
  }

  const handleDeleteLabel = id => {
    DeleteLabel(id).then(() => {
      const updatedLabels = userLabels.filter(label => label.id !== id)
      setUserLabels(updatedLabels)

      queryClient.invalidateQueries('labels')
    })
  }

  const handleSaveLabel = newOrUpdatedLabel => {
    queryClient.invalidateQueries('labels')
    setModalOpen(false)
    const updatedLabels = userLabels.map(label =>
      label.id === newOrUpdatedLabel.id ? newOrUpdatedLabel : label,
    )
    setUserLabels(updatedLabels)
  }

  useEffect(() => {
    if (labels) {
      setUserLabels(labels)
    }
  }, [labels])

  if (isLabelsLoading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100vh'
      >
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return (
      <Typography color='danger' textAlign='center'>
        {t('labelsView:loadFailed')}
      </Typography>
    )
  }

  return (
    <Container maxWidth='md' sx={{ px: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2 }}>
        {/* <EmojiEvents sx={{ fontSize: '2rem', color: '#FFD700' }} /> */}
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            {t('labelsView:title')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('labelsView:description')}
          </Typography>
        </Stack>
      </Box>
      <Box
        sx={{
          overflow: 'hidden',
        }}
      >
        {userLabels.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              height: '50vh',
            }}
          >
            <Typography level='title-md' gutterBottom>
              {t('labelsView:empty')}
            </Typography>
          </Box>
        )}
        <SwipeableList type={ListType.IOS} fullSwipe={false}>
          {userLabels.map(label => (
            <SwipeableListItem
              key={label.id}
              swipeActionOpen={showMoreInfoId === label.id ? 'trailing' : null}
              trailingActions={
                <TrailingActions>
                  <Box
                    sx={{
                      display: 'flex',
                      boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
                      zIndex: 0,
                    }}
                  >
                    <SwipeAction onClick={() => handleEditLabel(label)}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'neutral.softBg',
                          color: 'neutral.700',
                          px: 3,
                          height: '100%',
                        }}
                      >
                        <EditIcon sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          {t('common:actions.edit')}
                        </Typography>
                      </Box>
                    </SwipeAction>
                    <SwipeAction onClick={() => handleDeleteClicked(label.id)}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'danger.softBg',
                          color: 'danger.700',
                          px: 3,
                          height: '100%',
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          {t('common:actions.delete')}
                        </Typography>
                      </Box>
                    </SwipeAction>
                  </Box>
                </TrailingActions>
              }
            >
              <LabelCardContent
                label={label}
                currentUserId={userProfile?.id}
                t={t}
                onToggleActions={() => {
                  if (showMoreInfoId === label.id) {
                    setShowMoreInfoId(null)
                  } else {
                    setShowMoreInfoId(label.id)
                  }
                }}
              />
            </SwipeableListItem>
          ))}
        </SwipeableList>
      </Box>

      {modalOpen && (
        <LabelModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveLabel}
          label={currentLabel}
        />
      )}

      <Box
        sx={{
          ...getSafeBottomStyles({ bottom: 0, padding: 16 }),
          left: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          'z-index': 1000,
        }}
      >
        <IconButton
          color='primary'
          variant='solid'
          sx={{
            borderRadius: '50%',
            width: 50,
            height: 50,
          }}
          onClick={handleAddLabel}
        >
          <Add />
        </IconButton>
      </Box>
      <ConfirmationModal config={confirmationModel} />
    </Container>
  )
}

export default LabelView
