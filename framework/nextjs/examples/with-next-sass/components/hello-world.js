import Link from "next/link";
import styles from "./hello-world.module.scss";

export default () => (
  <div className={styles.hello}>
    Hello World, I am being styled using SCSS Modules!
    <Link href="/about">
      <a>Home</a>
    </Link>
  </div>
);
