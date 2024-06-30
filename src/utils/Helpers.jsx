import moment from 'moment'

const isPlusAccount = userProfile => {
  return userProfile?.expiration && moment(userProfile?.expiration).isAfter()
}

export { isPlusAccount }
