import { useEffect, useRef } from "react";

const HISTORY_KEY = "__habitforgeBackDismiss";

interface DismissEntry {
  token: string;
  onDismiss: () => void;
  canDismiss: () => boolean;
  dismissedByBack: boolean;
}

const stack: DismissEntry[] = [];
let popstateAttached = false;
let pendingHistoryBack: ReturnType<typeof window.setTimeout> | null = null;

function historyStateWithToken(token: string) {
  const base =
    window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  const next = { ...base, [HISTORY_KEY]: token };

  if (typeof base.idx === "number") {
    next.idx = base.idx + 1;
  }

  return next;
}

function currentHistoryToken(): string | undefined {
  const state = window.history.state;
  return state && typeof state === "object" ? state[HISTORY_KEY] : undefined;
}

function attachPopstateListener() {
  if (popstateAttached) return;

  window.addEventListener("popstate", () => {
    const top = stack[stack.length - 1];
    if (!top) return;

    if (!top.canDismiss()) {
      window.history.pushState(historyStateWithToken(top.token), "", window.location.href);
      return;
    }

    top.dismissedByBack = true;
    top.onDismiss();
  });

  popstateAttached = true;
}

function registerBackDismiss(
  token: string,
  onDismiss: () => void,
  canDismiss: () => boolean
) {
  attachPopstateListener();

  if (pendingHistoryBack) {
    window.clearTimeout(pendingHistoryBack);
    pendingHistoryBack = null;
  }

  const historyToken = currentHistoryToken();
  const historyTokenIsOrphaned =
    !!historyToken && !stack.some((entry) => entry.token === historyToken);

  if (historyTokenIsOrphaned) {
    window.history.replaceState(historyStateWithToken(token), "", window.location.href);
  } else {
    window.history.pushState(historyStateWithToken(token), "", window.location.href);
  }

  const entry: DismissEntry = {
    token,
    onDismiss,
    canDismiss,
    dismissedByBack: false,
  };
  stack.push(entry);

  return () => {
    const index = stack.findIndex((item) => item.token === token);
    if (index >= 0) stack.splice(index, 1);

    if (entry.dismissedByBack || currentHistoryToken() !== token) return;

    pendingHistoryBack = window.setTimeout(() => {
      pendingHistoryBack = null;
      if (currentHistoryToken() === token) {
        window.history.back();
      }
    }, 0);
  };
}

export function useBackDismiss(
  active: boolean,
  onDismiss: () => void,
  options: { enabled?: boolean; canDismiss?: boolean } = {}
) {
  const tokenRef = useRef<string>();
  const onDismissRef = useRef(onDismiss);
  const canDismissRef = useRef(options.canDismiss ?? true);

  if (!tokenRef.current) {
    tokenRef.current = `hf-overlay-${Math.random().toString(36).slice(2)}`;
  }

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    canDismissRef.current = options.canDismiss ?? true;
  }, [options.canDismiss]);

  useEffect(() => {
    if (!active || options.enabled === false || typeof window === "undefined") return;

    return registerBackDismiss(
      tokenRef.current!,
      () => onDismissRef.current(),
      () => canDismissRef.current
    );
  }, [active, options.enabled]);
}
