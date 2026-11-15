import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  RefObject,
} from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  type HTMLMotionProps,
  type MotionValue,
  type Variants,
} from 'motion/react';
import { motionTokens } from './filter-toolbar-utils/motion-tokens';
import styles from './filter-toolbar-utils/filter-toolbar.module.css';

export interface FilterChip {
  id: string;
  label: string;
  value?: string;
}

/** One value a field can take. `hint` sits at the end of the row, for example a count. */
export interface FilterOption {
  value: string;
  label?: string;
  hint?: string | number;
  icon?: ReactNode;
}

export interface FilterField {
  id: string;
  label: string;
  icon?: ReactNode;
  options: (string | FilterOption)[];
}

export interface FilterMenuProps {
  fields: FilterField[];
  /** Receives a chip whose id is the field id, so a second pick for a field replaces the first. */
  onSelect: (filter: FilterChip, field: FilterField) => void;
  /** Applied filters. Each field shows its current value and the value step marks it. */
  active?: FilterChip[];
  label?: string;
  /** The trigger edge the panel lines up with. It flips or shifts when the viewport, or a clipping ancestor, has no room. */
  align?: 'start' | 'end';
}

export interface FilterToolbarProps {
  filters: FilterChip[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  children?: ReactNode;
  label?: string;
  emptyLabel?: string | null;
  /** Adds an Add filter trigger that morphs into a two step field and value menu. */
  addFilter?: {
    fields: FilterField[];
    onAdd: (filter: FilterChip, field: FilterField) => void;
    label?: string;
    align?: 'start' | 'end';
  };
}

const enter = {
  duration: motionTokens.duration.standard,
  ease: [...motionTokens.ease.enter] as const,
};
const leave = {
  duration: motionTokens.duration.instant,
  ease: [...motionTokens.ease.standard] as const,
};
const still = { duration: 0 };
const fade = {
  duration: motionTokens.duration.instant,
  ease: 'linear' as const,
};
const blur = (px: number) => `blur(${px}px)`;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const toOption = (entry: string | FilterOption): FilterOption =>
  typeof entry === 'string' ? { value: entry } : entry;
const optionText = (entry: FilterOption) => entry.label ?? entry.value;
const textMotion = (reduced: boolean) => ({
  initial: reduced
    ? { opacity: 0 }
    : { opacity: 0, y: '0.3em', filter: blur(motionTokens.blur.soft) },
  animate: { opacity: 1, y: 0, filter: blur(0) },
  exit: reduced
    ? { opacity: 0, transition: still }
    : {
        opacity: 0,
        y: '-0.3em',
        filter: blur(motionTokens.blur.subtle),
        transition: leave,
      },
  transition: reduced ? fade : enter,
});

/** Text that swaps with a rise and blur while its box springs to the new width, so nothing beside it snaps. */
function MorphText({ text }: { text: string }) {
  const reduced = useReducedMotion() ?? false;
  const measure = useRef<HTMLSpanElement>(null);
  const width = useMotionValue<number | 'auto'>('auto');
  useLayoutEffect(() => {
    const node = measure.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let last: string | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.ceil(
          entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth
        ),
        changed = last !== null && last !== node.textContent;
      last = node.textContent;
      if (changed && !reduced)
        animate(width as MotionValue<number>, next, motionTokens.spring.morph);
      else width.jump(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, width]);

  return (
    <motion.span className={styles.morphText} style={{ width }}>
      <span ref={measure} className={styles.measure} aria-hidden="true">
        {text}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className={styles.morphValue}
          {...textMotion(reduced)}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/** Springs a wrapper to the height of its content while filters change; other resizes follow at once. */
function useFollowHeight(
  list: RefObject<HTMLElement | null>,
  armed: RefObject<number>,
  reduced: boolean
) {
  const height = useMotionValue<number | 'auto'>('auto');
  useLayoutEffect(() => {
    const node = list.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let known = false;
    const observer = new ResizeObserver(() => {
      const next = node.offsetHeight;
      if (!known || reduced || performance.now() > armed.current) {
        known = true;
        height.jump(next);
        return;
      }
      animate(height as MotionValue<number>, next, motionTokens.spring.smooth);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [armed, height, list, reduced]);
  return height;
}

/** Chips glide with the slot widths, but a chip that wraps to another line would teleport. Resize observers run after
 *  layout and before paint, so each jump is offset in the same frame and springs back to zero from where it was seen. */
function useReflowGlide(
  list: RefObject<HTMLElement | null>,
  armed: RefObject<number>,
  reduced: boolean
) {
  useLayoutEffect(() => {
    const node = list.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    type Track = {
      x: number;
      y: number;
      dx: number;
      dy: number;
      stop?: () => void;
    };
    const tracks = new Map<Element, Track>();
    const check = () => {
      const now = performance.now();
      for (const child of Array.from(node.children) as HTMLElement[]) {
        const x = child.offsetLeft,
          y = child.offsetTop,
          track = tracks.get(child);
        if (!track) {
          tracks.set(child, { x, y, dx: 0, dy: 0 });
          continue;
        }
        const jx = track.x - x,
          jy = track.y - y;
        track.x = x;
        track.y = y;
        if (
          reduced ||
          now > armed.current ||
          (Math.abs(jy) < 1 && Math.abs(jx) < 40)
        )
          continue;
        track.stop?.();
        const fromX = track.dx + jx,
          fromY = track.dy + jy;
        const apply = (progress: number) => {
          track.dx = fromX * (1 - progress);
          track.dy = fromY * (1 - progress);
          child.style.translate =
            progress >= 1 ? '' : `${track.dx}px ${track.dy}px`;
        };
        apply(0);
        track.stop = animate(0, 1, {
          ...motionTokens.spring.smooth,
          onUpdate: apply,
          onComplete: () => apply(1),
        }).stop;
      }
      for (const child of tracks.keys())
        if (child.parentElement !== node) tracks.delete(child);
    };
    const observer = new ResizeObserver(check);
    const watch = () => {
      for (const child of Array.from(node.children)) observer.observe(child);
    };
    const mutations = new MutationObserver(() => {
      watch();
      check();
    });
    observer.observe(node);
    watch();
    mutations.observe(node, { childList: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      for (const track of tracks.values()) track.stop?.();
    };
  }, [armed, list, reduced]);
}

function describeChange(before: FilterChip[], after: FilterChip[]) {
  const text = (filter: FilterChip) =>
    filter.value ? `${filter.label}: ${filter.value}` : filter.label;
  const removed = before.filter(
    (old) => !after.some((filter) => filter.id === old.id)
  );
  if (!after.length && removed.length > 1) return 'All filters cleared';
  const added = after.filter(
    (filter) => !before.some((old) => old.id === filter.id)
  );
  const changed = after.filter((filter) =>
    before.some((old) => old.id === filter.id && old.value !== filter.value)
  );
  return [
    ...added.map((filter) => `Added ${text(filter)}`),
    ...changed.map(
      (filter) => `${filter.label} changed to ${filter.value ?? 'any'}`
    ),
    ...removed.map((filter) => `Removed ${text(filter)}`),
  ].join('. ');
}

type Row = {
  key: string;
  label: string;
  icon?: ReactNode;
  meta?: ReactNode;
  checked?: boolean;
  drill?: boolean;
};
type FocusRequest = 'first' | 'last' | 'checked' | 'panel' | { key: string };

/** A roving list with one highlight that glides under the pointer and jumps with the keyboard. */
function MenuList({
  rows,
  labelledBy,
  onChoose,
  onBack,
  onLeave,
  radio,
}: {
  rows: Row[];
  labelledBy: string;
  onChoose: (row: Row, keyboard: boolean) => void;
  onBack?: (keyboard: boolean) => void;
  onLeave: () => void;
  radio?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const present = useIsPresent();
  const list = useRef<HTMLDivElement>(null);
  const pointer = useRef(false);
  const typed = useRef({ text: '', at: 0 });
  const [current, setCurrent] = useState(() =>
    Math.max(
      0,
      rows.findIndex((row) => row.checked)
    )
  );
  const [highlight, setHighlight] = useState<{
    top: number;
    height: number;
    glide: boolean;
    ring: boolean;
    shown: boolean;
  } | null>(null);

  const items = () =>
    Array.from(list.current?.querySelectorAll<HTMLElement>('[data-row]') ?? []);

  const move = (item: HTMLElement | undefined) => {
    const node = list.current;
    if (!item || !node) return;
    item.focus({ preventScroll: true });
    if (item.offsetTop < node.scrollTop) node.scrollTop = item.offsetTop;
    else if (
      item.offsetTop + item.offsetHeight >
      node.scrollTop + node.clientHeight
    )
      node.scrollTop = item.offsetTop + item.offsetHeight - node.clientHeight;
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const all = items(),
      index = all.indexOf(document.activeElement as HTMLElement);
    const go = (next: number) => {
      event.preventDefault();
      pointer.current = false;
      move(all[next]);
    };
    if (event.key === 'ArrowDown')
      return go(index < 0 ? 0 : (index + 1) % all.length);
    if (event.key === 'ArrowUp')
      return go(
        index < 0 ? all.length - 1 : (index - 1 + all.length) % all.length
      );
    if (event.key === 'Home') return go(0);
    if (event.key === 'End') return go(all.length - 1);
    if (event.key === 'ArrowRight' && index >= 0 && rows[index]?.drill) {
      event.preventDefault();
      onChoose(rows[index], true);
      return;
    }
    if (event.key === 'ArrowLeft' && onBack) {
      event.preventDefault();
      onBack(true);
      return;
    }
    if (
      event.key.length === 1 &&
      /\S/.test(event.key) &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      const now = performance.now();
      typed.current = {
        text:
          now - typed.current.at < 700
            ? typed.current.text + event.key.toLowerCase()
            : event.key.toLowerCase(),
        at: now,
      };
      const order = [
        ...all.slice(index + (typed.current.text.length > 1 ? 0 : 1)),
        ...all.slice(0, index + (typed.current.text.length > 1 ? 0 : 1)),
      ];
      const match = order.find((item) =>
        (item.dataset.text ?? '').toLowerCase().startsWith(typed.current.text)
      );
      if (match) go(all.indexOf(match));
    }
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    const item = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-row]'
    );
    if (!item) return;
    setCurrent(items().indexOf(item));
    const glide = pointer.current && !reduced,
      ring = !pointer.current && item.matches(':focus-visible');
    setHighlight((previous) => ({
      top: item.offsetTop,
      height: item.offsetHeight,
      glide: glide && !!previous?.shown,
      ring,
      shown: true,
    }));
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!list.current?.contains(event.relatedTarget as Node | null))
      setHighlight(
        (previous) =>
          previous && { ...previous, glide: false, ring: false, shown: false }
      );
  }

  return (
    <div
      ref={list}
      className={styles.list}
      role="menu"
      aria-labelledby={labelledBy}
      data-current={present ? '' : undefined}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerLeave={() => {
        if (pointer.current && list.current?.contains(document.activeElement))
          onLeave();
      }}
    >
      <motion.span
        className={styles.highlight}
        data-ring={highlight?.ring || undefined}
        aria-hidden="true"
        initial={false}
        animate={
          highlight
            ? {
                y: highlight.top,
                height: highlight.height,
                opacity: highlight.shown ? 1 : 0,
              }
            : { opacity: 0 }
        }
        transition={{
          default: highlight?.glide ? motionTokens.spring.snappy : still,
          opacity: { duration: reduced ? 0 : 0.08 },
        }}
      />
      {rows.map((row, index) => (
        <button
          key={row.key}
          type="button"
          className={styles.item}
          role={radio ? 'menuitemradio' : 'menuitem'}
          aria-checked={radio ? !!row.checked : undefined}
          tabIndex={index === current ? 0 : -1}
          data-row={row.key}
          data-text={row.label}
          onPointerMove={(event) => {
            pointer.current = true;
            if (document.activeElement !== event.currentTarget)
              event.currentTarget.focus({ preventScroll: true });
          }}
          onClick={(event: MouseEvent<HTMLButtonElement>) =>
            onChoose(row, event.detail === 0)
          }
        >
          {row.icon ? (
            <span className={styles.itemIcon} aria-hidden="true">
              {row.icon}
            </span>
          ) : null}
          <span className={styles.itemLabel}>{row.label}</span>
          {row.meta ? (
            <span className={styles.itemMeta}>{row.meta}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

type Phase = 'closed' | 'open' | 'closing';

/** The room the panel may use: the viewport, narrowed on each axis by any ancestor that clips that axis. */
function roomFor(node: HTMLElement) {
  const room = {
    left: 0,
    top: 0,
    right: document.documentElement.clientWidth,
    bottom: window.innerHeight,
  };
  for (
    let parent = node.parentElement;
    parent && parent !== document.body;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent);
    if (style.overflowX === 'visible' && style.overflowY === 'visible')
      continue;
    const box = parent.getBoundingClientRect();
    if (style.overflowX !== 'visible') {
      room.left = Math.max(room.left, box.left);
      room.right = Math.min(room.right, box.right);
    }
    if (style.overflowY !== 'visible') {
      room.top = Math.max(room.top, box.top);
      room.bottom = Math.min(room.bottom, box.bottom);
    }
  }
  return room;
}

/** An Add filter button that grows into its own menu: pick a field, then a value. */
export function FilterMenu({
  fields,
  onSelect,
  active = [],
  label = 'Add filter',
  align = 'end',
}: FilterMenuProps) {
  const reduced = useReducedMotion() ?? false;
  const id = useId(),
    panelId = `${id}panel`,
    titleId = `${id}title`;
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>('closed'),
    run = useRef(0),
    focusNext = useRef<FocusRequest | null>(null);
  const [phase, setPhase] = useState<Phase>('closed');
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const [up, setUp] = useState(false);

  const width = useMotionValue<number | string>('100%'),
    height = useMotionValue<number | string>('100%');
  const left = useMotionValue(0);

  const open = phase === 'open',
    field = fields.find((entry) => entry.id === fieldId) ?? null;

  const openMenu = useCallback(
    (focus: FocusRequest) => {
      const button = trigger.current,
        content = panel.current;
      if (!button || !content) return;
      const rect = button.getBoundingClientRect(),
        panelWidth = content.offsetWidth + 2,
        panelHeight = content.offsetHeight + 2;
      const room = roomFor(root.current ?? button),
        gutter = 16;
      const min = room.left + gutter - rect.left,
        max = room.right - gutter - rect.left - panelWidth,
        end = rect.width - panelWidth;
      let x =
        align === 'end'
          ? end >= min
            ? end
            : 0 <= max
              ? 0
              : end
          : 0 <= max
            ? 0
            : end >= min
              ? end
              : 0;
      x = Math.round(Math.min(Math.max(x, min), Math.max(min, max)));
      const below = room.bottom - rect.bottom,
        above = rect.top - room.top;
      const nextUp = below < panelHeight + gutter && above > below;

      left.jump(x);
      width.jump(panelWidth);
      height.jump(panelHeight);

      phaseRef.current = 'open';
      run.current += 1;
      focusNext.current = focus;
      setPhase('open');
      setUp(nextUp);
      setFieldId(null);
      setDirection(-1);
    },
    [align, height, left, width]
  );

  const closeMenu = useCallback(
    (restore: false | 'keyboard' | 'pointer') => {
      const button = trigger.current;
      if (phaseRef.current !== 'open' || !button) return;
      phaseRef.current = 'closing';
      const token = (run.current += 1);
      setPhase('closing');
      if (restore)
        button.focus({
          preventScroll: true,
        });

      const exitDuration = reduced ? 0 : 150;
      window.setTimeout(() => {
        if (token !== run.current) return;
        phaseRef.current = 'closed';
        setPhase('closed');
        setFieldId(null);
      }, exitDuration);
    },
    [reduced]
  );

  useLayoutEffect(() => {
    const content = panel.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (phaseRef.current !== 'open') return;
      animate(
        height as MotionValue<number>,
        content.offsetHeight + 2,
        reduced ? still : motionTokens.spring.smooth
      );
      animate(
        width as MotionValue<number>,
        content.offsetWidth + 2,
        reduced ? still : motionTokens.spring.smooth
      );
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [height, width, reduced]);

  useLayoutEffect(() => {
    const request = focusNext.current,
      content = panel.current;
    if (!request || !content || phase !== 'open') return;
    focusNext.current = null;
    if (request === 'panel') {
      content.focus({ preventScroll: true });
      return;
    }
    const items = Array.from(
      content.querySelectorAll<HTMLElement>('[data-current] [data-row]')
    );
    const next =
      request === 'first'
        ? items[0]
        : request === 'last'
          ? items.at(-1)
          : request === 'checked'
            ? (items.find(
                (item) => item.getAttribute('aria-checked') === 'true'
              ) ?? items[0])
            : typeof request === 'object' && 'key' in request
              ? (items.find((item) => item.dataset.row === request.key) ??
                items[0])
              : items[0];
    next?.focus({ preventScroll: true });
  }, [phase, fieldId]);

  useEffect(() => {
    if (phase !== 'open') return;
    const onPointerDown = (event: PointerEvent) => {
      const node = root.current,
        hit = event.target as Element | null;
      if (!node || (hit && node.contains(hit))) return;
      closeMenu(false);
      if (
        !hit?.closest?.(
          'button, a[href], input, select, textarea, [tabindex], [contenteditable]'
        )
      )
        window.setTimeout(() => {
          const focused = document.activeElement;
          if (!focused || focused === document.body || node.contains(focused))
            trigger.current?.focus({
              preventScroll: true,
            });
        }, 0);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, [closeMenu, phase]);

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.defaultPrevented) return;
    const items = Array.from(
      panel.current?.querySelectorAll<HTMLElement>(
        '[data-current] [data-row]'
      ) ?? []
    );
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      (event.key === 'ArrowDown' ? items[0] : items.at(-1))?.focus({
        preventScroll: true,
      });
    }
    if (event.key === 'ArrowLeft' && field) {
      event.preventDefault();
      goBack(true);
    }
  }

  function goBack(keyboard: boolean) {
    if (!field) return;
    focusNext.current = keyboard ? { key: field.id } : 'panel';
    setDirection(-1);
    setFieldId(null);
  }

  function chooseField(row: Row, keyboard: boolean) {
    focusNext.current = keyboard ? 'checked' : 'panel';
    setDirection(1);
    setFieldId(row.key);
  }

  function chooseValue(row: Row, keyboard: boolean) {
    if (!field) return;
    onSelect({ id: field.id, label: field.label, value: row.label }, field);
    closeMenu(keyboard ? 'keyboard' : 'pointer');
  }

  const current = (entry: FilterField) =>
    active.find((filter) => filter.id === entry.id)?.value;
  const fieldRows: Row[] = fields.map((entry) => ({
    key: entry.id,
    label: entry.label,
    icon: entry.icon,
    drill: true,
    meta: (
      <>
        {current(entry) ? (
          <span className={styles.metaValue}>{current(entry)}</span>
        ) : null}
        <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" />
      </>
    ),
  }));

  const valueRows: Row[] = field
    ? field.options.map(toOption).map((entry) => {
        const text = optionText(entry),
          checked = current(field) === text;
        return {
          key: entry.value,
          label: text,
          icon: entry.icon,
          checked,
          meta:
            entry.hint != null || checked ? (
              <>
                {entry.hint != null ? (
                  <span className={styles.hint}>{entry.hint}</span>
                ) : null}
                <span className={styles.check} data-on={checked || undefined}>
                  <Check size={15} strokeWidth={2} aria-hidden="true" />
                </span>
              </>
            ) : null,
        };
      })
    : [];

  const step: Variants = {
    enter: (dir: number) =>
      reduced
        ? { opacity: 0 }
        : { opacity: 0, x: dir * 18, filter: blur(motionTokens.blur.soft) },
    center: {
      opacity: 1,
      x: 0,
      filter: blur(0),
      transition: reduced ? fade : { ...enter, x: motionTokens.spring.smooth },
    },
    exit: (dir: number) =>
      reduced
        ? { opacity: 0, transition: still }
        : {
            opacity: 0,
            x: dir * -18,
            filter: blur(motionTokens.blur.subtle),
            transition: leave,
          },
  };

  return (
    <div
      ref={root}
      className={styles.menu}
      data-state={phase}
      data-y={up ? 'up' : 'down'}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && phaseRef.current === 'open') {
          event.preventDefault();
          event.stopPropagation();
          closeMenu('keyboard');
        }
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (
          phaseRef.current === 'open' &&
          next &&
          !root.current?.contains(next)
        )
          closeMenu(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        data-filter-trigger=""
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        tabIndex={open ? -1 : undefined}
        onClick={(event) => {
          if (phaseRef.current !== 'open')
            openMenu(event.detail === 0 ? 'first' : 'panel');
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openMenu(event.key === 'ArrowDown' ? 'first' : 'last');
          }
        }}
      >
        <span className={styles.face}>
          <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </span>
      </button>
      <motion.div
        className={styles.surface}
        style={{ left, width, height }}
        initial={false}
        animate={
          open
            ? { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' }
            : { opacity: 0, scale: 0.97, y: up ? 4 : -4, pointerEvents: 'none' }
        }
        transition={reduced ? still : motionTokens.spring.snappy}
      >
        <div
          ref={panel}
          id={panelId}
          className={styles.panel}
          role={open ? 'dialog' : undefined}
          aria-labelledby={titleId}
          tabIndex={-1}
          inert={!open}
          onKeyDown={onPanelKeyDown}
        >
          <div>
            <div className={styles.head}>
              <AnimatePresence initial={false}>
                {field ? (
                  <motion.button
                    key="back"
                    type="button"
                    className={styles.back}
                    aria-label="Back to fields"
                    onClick={(event) => goBack(event.detail === 0)}
                    initial={
                      reduced
                        ? { opacity: 0, width: 28, marginRight: 2 }
                        : { opacity: 0, width: 0, marginRight: 0, scale: 0.6 }
                    }
                    animate={{
                      opacity: 1,
                      width: 28,
                      marginRight: 2,
                      scale: 1,
                    }}
                    exit={
                      reduced
                        ? { opacity: 0, transition: still }
                        : {
                            opacity: 0,
                            width: 0,
                            marginRight: 0,
                            scale: 0.6,
                            transition: {
                              ...motionTokens.spring.snappy,
                              opacity: leave,
                            },
                          }
                    }
                    transition={
                      reduced
                        ? fade
                        : { ...motionTokens.spring.snappy, opacity: enter }
                    }
                  >
                    <ChevronLeft
                      size={16}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </motion.button>
                ) : null}
              </AnimatePresence>
              <span className={styles.title} id={titleId}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={field?.id ?? 'fields'}
                    className={styles.titleText}
                    {...textMotion(reduced)}
                  >
                    {field ? field.label : label}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
            <div className={styles.stage}>
              <AnimatePresence
                mode="popLayout"
                initial={false}
                custom={direction}
              >
                <motion.div
                  key={field?.id ?? 'fields'}
                  className={styles.step}
                  custom={direction}
                  variants={step}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {field ? (
                    <MenuList
                      rows={valueRows}
                      labelledBy={titleId}
                      radio
                      onChoose={chooseValue}
                      onBack={goBack}
                      onLeave={() =>
                        panel.current?.focus({ preventScroll: true })
                      }
                    />
                  ) : (
                    <MenuList
                      rows={fieldRows}
                      labelledBy={titleId}
                      onChoose={chooseField}
                      onLeave={() =>
                        panel.current?.focus({ preventScroll: true })
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function FilterToolbar({
  filters,
  onRemove,
  onClearAll,
  children,
  label = 'Active filters',
  emptyLabel,
  addFilter,
}: FilterToolbarProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null),
    list = useRef<HTMLDivElement>(null);
  const armed = useRef(0),
    pendingFocus = useRef<number | null>(null);
  const [seen, setSeen] = useState(filters);
  const [message, setMessage] = useState('');
  if (seen !== filters) {
    setSeen(filters);
    const next = describeChange(seen, filters);
    if (next) setMessage(next);
  }
  const signature = filters
    .map((filter) => `${filter.id}:${filter.value ?? ''}`)
    .join('|');

  useLayoutEffect(() => {
    armed.current = performance.now() + 900;
  }, [signature]);

  const frameHeight = useFollowHeight(list, armed, reduced);
  useReflowGlide(list, armed, reduced);

  useLayoutEffect(() => {
    const index = pendingFocus.current,
      node = root.current;
    if (index === null || !node) return;
    pendingFocus.current = null;
    const next = filters[Math.min(index, filters.length - 1)];
    const target = next
      ? node.querySelector<HTMLElement>(
          `[data-chip-remove="${CSS.escape(next.id)}"]`
        )
      : node.querySelector<HTMLElement>('[data-filter-trigger]');
    target?.focus({ preventScroll: true });
  }, [filters]);

  const slot = (gap: number): HTMLMotionProps<'span'> => ({
    initial: reduced
      ? false
      : { width: 0, marginRight: -gap, overflow: 'clip' },
    animate: {
      width: 'auto',
      marginRight: 0,
      transitionEnd: { overflow: 'visible' },
    },
    exit: reduced
      ? { opacity: 0, transition: still }
      : {
          width: 0,
          marginRight: -gap,
          overflow: 'clip',
          pointerEvents: 'none',
          transition: motionTokens.spring.smooth,
        },
    transition: reduced ? still : motionTokens.spring.smooth,
  });

  const chip = {
    initial: reduced
      ? (false as const)
      : { opacity: 0, scale: 0.9, filter: blur(motionTokens.blur.soft) },
    animate: { opacity: 1, scale: 1, filter: blur(0) },
    exit: reduced
      ? { opacity: 0, transition: still }
      : {
          opacity: 0,
          scale: 0.9,
          filter: blur(motionTokens.blur.subtle),
          transition: leave,
        },
    transition: reduced
      ? still
      : { ...enter, scale: motionTokens.spring.snappy },
  };

  const text = reduced
    ? { ...textMotion(true), initial: false as const }
    : textMotion(false);

  const emptyText = reduced
    ? text
    : {
        ...text,
        transition: { ...enter, delay: motionTokens.duration.instant * 0.75 },
      };

  return (
    <div ref={root} className={styles.toolbar} role="group" aria-label={label}>
      <motion.div className={styles.frame} style={{ height: frameHeight }}>
        <div ref={list} className={styles.chips}>
          <AnimatePresence initial={false}>
            {filters.map((filter, index) => (
              <motion.span className={styles.slot} key={filter.id} {...slot(8)}>
                <motion.span className={styles.chip} {...chip}>
                  <span className={styles.chipLabel}>
                    {filter.label}
                    {filter.value ? (
                      <span className={styles.value}>
                        <span className={styles.separator}> · </span>
                        <MorphText text={filter.value} />
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    data-chip-remove={filter.id}
                    aria-label={`Remove filter ${filter.label}${filter.value ? `: ${filter.value}` : ''}`}
                    className="w-7 h-7 -my-1 -mr-0.5 rounded-full hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer text-slate-400 hover:text-rose-600"
                    onClick={(event) => {
                      if (document.activeElement === event.currentTarget)
                        pendingFocus.current = index;
                      onRemove(filter.id);
                    }}
                  >
                    <X size={14} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </motion.span>
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence initial={false}>
            {filters.length || emptyLabel === null || emptyLabel === '' ? null : (
              <motion.span key="empty" className={styles.empty} {...emptyText}>
                {emptyLabel ?? 'No filters applied'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <div className={styles.actions}>
        {addFilter ? (
          <FilterMenu
            fields={addFilter.fields}
            onSelect={addFilter.onAdd}
            active={filters}
            label={addFilter.label}
            align={addFilter.align}
          />
        ) : null}
        {children}
        <AnimatePresence initial={false}>
          {filters.length > 0 ? (
            <motion.span key="clear" className={styles.slot} {...slot(12)}>
              <button
                className={styles.clear}
                type="button"
                onClick={() => {
                  pendingFocus.current = -1;
                  onClearAll?.();
                }}
              >
                <motion.span className={styles.clearText} {...text}>
                  Clear all
                </motion.span>
              </button>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <span className={styles.srOnly} role="status">
        {message}
      </span>
    </div>
  );
}

export default FilterToolbar;
