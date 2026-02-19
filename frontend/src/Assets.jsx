import cd_blue from './assets/CD-Blue.svg'

export const CD_Blue = ({ className = '', alt = 'CD Logo', ...props}) => (
  <img src={cd_blue} alt={alt} className={className} {...props} />
)