import cd_blue from './assets/CD-Blue.svg'
import soon_gif from './assets/soon.gif'

export const CD_Blue = ({ className = '', alt = 'CD Logo', ...props}) => (
  <img src={cd_blue} alt={alt} className={className} {...props} />
)

export const Soon_GIF = ({ className = '', alt = 'Loading Gif', ...props}) => (
  <img src={soon_gif} alt={alt} className={className} {...props}/>
)