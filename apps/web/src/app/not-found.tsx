import Link from "next/link";
import styles from "./error.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.text}>This demo has a single page: the sitter search.</p>
      <Link href="/" className={styles.link}>
        Back to the search
      </Link>
    </main>
  );
}
