import QueryContext from './QueryContext'
import RouterContext from './RouterContext'
import ThemeContext from './ThemeContext'

const Contexts = () => {
  const contexts = [ThemeContext, QueryContext, RouterContext]

  return contexts.reduceRight((acc, Context) => {
    return <Context>{acc}</Context>
  }, {})
}

export default Contexts
