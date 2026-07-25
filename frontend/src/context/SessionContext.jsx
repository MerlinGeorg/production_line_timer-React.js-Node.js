import { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../api/client.js';

const STORAGE_KEY = 'timer_login_id';

function reducer(state, action) {
  switch (action.type) {
    case 'READY':
      return { ...state, status: 'idle' };

    case 'SESSION_LOADED':
    case 'SESSION_STARTED':
      return { status: 'active', session: action.session };

    case 'SESSION_PATCH':
      return {
        ...state,
        session: state.session ? { ...state.session, ...action.patch } : state.session,
      };

    case 'SESSION_CLEARED':
      return { status: 'idle', session: null };

    default:
      return state;
  }
}

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { status: 'booting', session: null });

  // Restore session from backend on mount
  useEffect(() => {
    const loginId = localStorage.getItem(STORAGE_KEY);
    if (!loginId) { dispatch({ type: 'READY' }); return; }

    const controller = new AbortController();

    api.getActiveSession(loginId, controller.signal)
      .then((session) => dispatch({ type: 'SESSION_LOADED', session }))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          localStorage.removeItem(STORAGE_KEY);
          dispatch({ type: 'READY' });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) dispatch({ type: 'READY' });
      });

    return () => controller.abort();
  }, []);

  const ctx = {
    status:  state.status,
    session: state.session,
    loading: state.status === 'booting',

    startSession(session) {
      localStorage.setItem(STORAGE_KEY, session.loginId);
      dispatch({ type: 'SESSION_STARTED', session });
    },

    patchSession(patch) {
      dispatch({ type: 'SESSION_PATCH', patch });
    },

    clearSession() {
      localStorage.removeItem(STORAGE_KEY);
      dispatch({ type: 'SESSION_CLEARED' });
    },
  };

  return <SessionContext value={ctx}>{children}</SessionContext>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
