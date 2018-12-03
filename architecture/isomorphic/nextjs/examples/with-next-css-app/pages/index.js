
/* Without CSS Modules, maybe with PostCSS */

import Link from 'next/link'
import '../style.css'

export default () => (
  <div>
    <div className='example'>O Hai world!</div>
    <Link href="/about"><a>Abount</a></Link>
  </div>
)

/* With CSS Modules */
/*
import css from "../style.css"

export default () => <div className={css.example}>Hello World, I am being styled using CSS Modules!</div>
*/
