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

const LabelCardContent = ({ label, currentUserId, onToggleActions }) => {
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
              Shared
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
      title: 'Delete Label',

      message:
        'Are you sure you want to delete this label? This will remove the label from all tasks.',

      confirmText: 'Delete',
      color: 'danger',
      cancelText: 'Cancel',
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
        Failed to load labels. Please try again.
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
            Labels
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Manage your labels and organize your tasks effectively. Labels will
            be automatically shared with your circle if they are used on a
            shared task.
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
              No labels available. Add a new label to get started.
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
                          Edit
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
                          Delete
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
