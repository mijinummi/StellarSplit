/**
 * usePaymentFeed.ts
 * Location: frontend/src/hooks/usePaymentFeed.ts
 *
 * Connects a socket.io-client socket to the backend PaymentGateway,
 * subscribes to the active split room, and exposes live payment events.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentEventStatus =
    | 'pending'
    | 'processing'
    | 'confirmed'
    | 'failed';

export interface PaymentStatusEvent {
    /** ISO timestamp of the event */
    timestamp: string;
    /** The participant / wallet that made the payment */
    payerId: string;
    /** Human-readable shortened address or name */
    payerLabel: string;
    /** Amount paid in the split's currency */
    amount: number;
    /** Currency code, e.g. "USDC" */
    currency: string;
    /** Stellar transaction hash */
    txHash: string;
    /** Current status of the payment */
    status: PaymentEventStatus;
}

export interface SplitCompletionEvent {
    splitId: string;
    timestamp: string;
    totalAmount: number;
    currency: string;
}

export type FeedStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UsePaymentFeedReturn {
    /** Most recent payment-status-update event, or null if none received yet */
    latestEvent: PaymentStatusEvent | null;
    /** Fired once when all participants have settled */
    completionEvent: SplitCompletionEvent | null;
    /** Connection health */
    status: FeedStatus;
    /** All events received this session, newest first, capped at MAX_EVENTS */
    events: PaymentStatusEvent[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_EVENTS = 10;
const SOCKET_URL =
    import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_BASE_URL ?? '';

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribe to real-time payment updates for a given split.
 *
 * @param splitId  - The split room to join. Pass null / undefined to skip.
 * @param authToken - JWT used to authenticate the socket handshake.
 */
export function usePaymentFeed(
    splitId: string | null | undefined,
    authToken?: string | null,
): UsePaymentFeedReturn {
    const socketRef = useRef<Socket | null>(null);

    const [latestEvent, setLatestEvent] = useState<PaymentStatusEvent | null>(null);
    const [completionEvent, setCompletionEvent] = useState<SplitCompletionEvent | null>(null);
    const [status, setStatus] = useState<FeedStatus>('disconnected');
    const [events, setEvents] = useState<PaymentStatusEvent[]>([]);

    const pushEvent = useCallback((event: PaymentStatusEvent) => {
        setLatestEvent(event);
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    }, []);

    useEffect(() => {
        if (!splitId) return;

        // ── Connect ──────────────────────────────────────────────────────────
        const socket: Socket = io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket'],
            auth: authToken ? { token: authToken } : undefined,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;
        setStatus('connecting');

        // ── Lifecycle events ─────────────────────────────────────────────────
        socket.on('connect', () => {
            setStatus('connected');
            socket.emit('join-room', { roomId: splitId });
        });

        socket.on('disconnect', () => {
            setStatus('disconnected');
        });

        socket.on('connect_error', () => {
            setStatus('error');
        });

        // ── Domain events ────────────────────────────────────────────────────
        socket.on('payment-status-update', (payload: PaymentStatusEvent) => {
            pushEvent(payload);
        });

        socket.on('split-completion', (payload: SplitCompletionEvent) => {
            setCompletionEvent(payload);
        });

        // ── Cleanup ──────────────────────────────────────────────────────────
        return () => {
            socket.emit('leave-user-room', { roomId: splitId });
            socket.disconnect();
            socketRef.current = null;
            setStatus('disconnected');
        };
    }, [splitId, authToken, pushEvent]);

    return { latestEvent, completionEvent, status, events };
}