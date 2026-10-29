import { CheckIcon } from "@/components/icons/icons";
import { cx } from "@/utils/cx/cx";
import type { Service } from "@sitter/domain/sitter";
import { SERVICE_DESCRIPTIONS, SERVICE_GROUPS, SERVICE_ICONS, SERVICE_LABELS } from "../../../utils/labels/labels";
import styles from "./ServicePicker.module.css";

type Props = {
  value: Service;
  onChange: (service: Service) => void;
};

/** Services grouped by where the care happens, each with a one-line description. */
export function ServicePicker({ value, onChange }: Props) {
  return (
    <div className={styles.picker}>
      {SERVICE_GROUPS.map((group) => (
        <section key={group.title} className={styles.group} aria-label={group.title}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          <ul className={styles.options}>
            {group.services.map((service) => {
              const selected = service === value;
              return (
                <li key={service}>
                  <button
                    type="button"
                    className={cx(styles.option, selected && styles.selected)}
                    aria-pressed={selected}
                    onClick={() => onChange(service)}
                  >
                    <span className={styles.icon} aria-hidden="true">
                      {SERVICE_ICONS[service]}
                    </span>
                    <span className={styles.text}>
                      <span className={styles.title}>{SERVICE_LABELS[service]}</span>
                      <span className={styles.description}>{SERVICE_DESCRIPTIONS[service]}</span>
                    </span>
                    {selected && <CheckIcon className={styles.check} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
