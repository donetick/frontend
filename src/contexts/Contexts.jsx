import QueryContext from './QueryContext'
import RouterContext from './RouterContext'
import SSEProvider from './SSEContext'
import ThemeContext from './ThemeContext'
import WebSocketProvider from './WebSocketContext'

const Contexts = () => {
  const contexts = [
    ThemeContext,
    QueryContext,
    SSEProvider,
    WebSocketProvider,
    RouterContext,
  ]

  return contexts.reduceRight((acc, Context) => {
    return <Context>{acc}</Context>
  }, {})
}

export default Contexts
