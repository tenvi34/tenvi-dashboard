import Command from '../modules/Command.jsx'
import useAppViewContext from './useAppViewContext.js'

function CommandView() {
  const { onModuleChange, t } = useAppViewContext()

  return <Command onModuleChange={onModuleChange} t={t} />
}

export default CommandView
