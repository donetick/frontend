import { AlertsProvider } from '../service/AlertsProvider'
import { NotificationProvider } from '../service/NotificationProvider'
import { LocalizationProvider } from './LocalizationContext'
import QueryContext from './QueryContext'
import RouterContext from './RouterContext'
import ThemeContext from './ThemeContext'

const Contexts = ({ children }) => {
  const contexts = [
    AlertsProvider,
    ThemeContext,
    LocalizationProvider,
    QueryContext,
    NotificationProvider,
    RouterContext,
  ]

  return contexts.reduceRight((acc, Context) => {
    return <Context>{acc}</Context>
  }, children)
}

export default Contexts
