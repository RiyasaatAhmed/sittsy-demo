import Image from "next/image";
import { ShieldIcon } from "@/components/icons/icons";
import { avatarDataUri } from "../../../utils/avatar/avatar";
import styles from "./SitterAvatar.module.css";

type Props = { id: number; name: string; identityVerified: boolean };

/** Illustrated portrait with an "ID verified" badge. */
export function SitterAvatar({ id, name, identityVerified }: Props) {
  return (
    <div className={styles.wrap}>
      {/* The avatar is an inline SVG data URI, so there is nothing to optimise. */}
      <Image
        unoptimized
        className={styles.avatar}
        src={avatarDataUri(id, name)}
        alt={`Illustrated avatar of ${name} (fake profile)`}
        width={94}
        height={94}
      />
      {identityVerified && (
        <span className={styles.badge} title="ID verified">
          <ShieldIcon />
        </span>
      )}
    </div>
  );
}
