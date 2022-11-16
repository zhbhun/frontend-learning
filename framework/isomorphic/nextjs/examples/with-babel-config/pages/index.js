import 'aaa';
import Link from 'next/link'
import '../bbb';

export default function IndexPage() {
  return (
    <div>
      Hello World.{' '}
      <Link href="/about">
        <a>About</a>
      </Link>
    </div>
  )
}
