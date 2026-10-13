"use client";

import { ArrowsClockwiseIcon, MapPinIcon } from "@phosphor-icons/react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { Mark } from "@/components/brand/Mark";
import styles from "./HangingBadge.module.css";

type Props = {
  portrait: string | null;
  portraitAlt: string;
  name: string;
  fullName: string;
  role: string;
  location: string;
  email: string;
  /** Extra content for the back of the card (stack icons, facts). */
  back: ReactNode;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// An ID badge on a lanyard. It swings from the clip like a pendulum: brush past it and it sways,
// drag it and it follows, let go and it settles. Click (or Enter) flips it to the back.
export function HangingBadge({ portrait, portraitAlt, name, fullName, role, location, email, back }: Props) {
  const reduce = useReducedMotion();
  const pivotRef = useRef<HTMLDivElement>(null);
  const target = useMotionValue(0);
  // Under-damped so a push overshoots and rocks to rest.
  const angle = useSpring(target, { stiffness: 60, damping: 5.5, mass: 1.1 });
  const flip = useSpring(0, { stiffness: 140, damping: 18 });
  const rotateY = useTransform(flip, (v) => v * 180);
  const [flipped, setFlipped] = useState(false);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const wasDrag = useRef(false);
  const settle = useRef<number | undefined>(undefined);

  const swing = (deg: number) => {
    if (reduce) return;
    target.set(clamp(deg, -28, 28));
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => target.set(0), 90);
  };

  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    if (reduce) flip.jump(next ? 1 : 0);
    else {
      flip.set(next ? 1 : 0);
      swing(next ? 7 : -7);
    }
  };

  const angleFromPivot = (clientX: number, clientY: number) => {
    const pivot = pivotRef.current?.getBoundingClientRect();
    if (!pivot) return 0;
    const dx = clientX - (pivot.left + pivot.width / 2);
    const dy = Math.max(40, clientY - pivot.top);
    return (-Math.atan2(dx, dy) * 180) / Math.PI;
  };

  return (
    <div className={styles.stage}>
      <div ref={pivotRef} className={styles.clip} aria-hidden="true" />
      <motion.div className={styles.swing} style={{ rotate: angle }}>
        <div className={styles.strap} aria-hidden="true">
          <span>{name} · {name} · {name} · {name} · {name}</span>
        </div>
        <div className={styles.hook} aria-hidden="true" />
        <motion.button
          type="button"
          className={styles.card}
          style={{ rotateY, transformPerspective: 1200 }}
          aria-label={flipped ? "Show the front of the ID card" : "Flip the ID card"}
          aria-pressed={flipped}
          onPointerDown={(e) => {
            if (reduce) return;
            drag.current = { x: e.clientX, y: e.clientY, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) {
              if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true;
              if (d.moved) target.set(clamp(angleFromPivot(e.clientX, e.clientY), -40, 40));
            } else if (e.pointerType === "mouse" && Math.abs(e.movementX) > 2) {
              swing(e.movementX * 0.9);
            }
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            wasDrag.current = Boolean(d?.moved);
            if (d?.moved) target.set(0);
          }}
          onPointerCancel={() => {
            drag.current = null;
            target.set(0);
          }}
          onClick={() => {
            // The click that ends a drag is not a flip; keyboard activation always is.
            if (wasDrag.current) {
              wasDrag.current = false;
              return;
            }
            toggle();
          }}
        >
          <span className={styles.front}>
            <span className={styles.cardHead}>
              <Mark className={styles.cardMark} />
              <span className={styles.cardId}>Developer ID</span>
            </span>
            <span className={styles.photo}>
              {portrait ? <Image src={portrait} alt={portraitAlt} fill sizes="260px" draggable={false} /> : null}
            </span>
            <span className={styles.name}>{name}</span>
            <span className={styles.fullName}>{fullName}</span>
            <span className={styles.role}>{role}</span>
            <span className={styles.cardFoot}>
              <span className={styles.place}>
                <MapPinIcon size={14} weight="fill" aria-hidden="true" />
                {location}
              </span>
              <span className={styles.flipHint}>
                <ArrowsClockwiseIcon size={14} weight="bold" aria-hidden="true" />
                Flip
              </span>
            </span>
          </span>
          <span className={styles.back}>
            <span className={styles.holo} aria-hidden="true" />
            <span className={styles.backBody}>
              {back}
              <span className={styles.backEmail}>{email}</span>
            </span>
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}
