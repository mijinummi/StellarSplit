/**
 * PaymentStatusFeed.test.tsx
 * Location: frontend/src/components/Payment/PaymentStatusFeed.test.tsx
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentStatusFeed } from './PaymentStatusFeed';
import type { PaymentStatusEvent, SplitCompletionEvent } from '../../hooks/usePaymentFeed';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<PaymentStatusEvent> = {}): PaymentStatusEvent => ({
    timestamp: new Date().toISOString(),
    payerId: 'GDKIJJIKXLOM2NRMPNQZUUYK24ZPVFC6426GZAICZ3VFYTD5EEJFUWS',
    payerLabel: 'Alice',
    amount: 25.5,
    currency: 'USDC',
    txHash: 'abc123',
    status: 'confirmed',
    ...overrides,
});

const makeCompletion = (overrides: Partial<SplitCompletionEvent> = {}): SplitCompletionEvent => ({
    splitId: 'split-001',
    timestamp: new Date().toISOString(),
    totalAmount: 120.0,
    currency: 'USDC',
    ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentStatusFeed', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders an empty state when no events exist', () => {
        render(
            <PaymentStatusFeed
                events={[]}
                latestEvent={null}
                completionEvent={null}
                status="connected"
            />,
        );
        expect(
            screen.getByText(/payments will appear here in real time/i),
        ).toBeInTheDocument();
    });

    it('renders a list of payment events', () => {
        const events = [
            makeEvent({ payerLabel: 'Alice', amount: 25.5, txHash: 'tx1' }),
            makeEvent({ payerLabel: 'Bob', amount: 37.0, txHash: 'tx2' }),
        ];

        render(
            <PaymentStatusFeed
                events={events}
                latestEvent={events[0]}
                completionEvent={null}
                status="connected"
            />,
        );

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('shows the aria-live polite list for screen readers', () => {
        const events = [makeEvent()];
        render(
            <PaymentStatusFeed
                events={events}
                latestEvent={events[0]}
                completionEvent={null}
                status="connected"
            />,
        );
        const list = screen.getByRole('list', { name: /payment updates/i });
        expect(list).toHaveAttribute('aria-live', 'polite');
    });

    it('highlights the latest event row briefly, then removes highlight', async () => {
        const event = makeEvent({ txHash: 'flash-tx' });
        const { rerender } = render(
            <PaymentStatusFeed
                events={[event]}
                latestEvent={null}
                completionEvent={null}
                status="connected"
            />,
        );

        // Trigger a new latest event
        rerender(
            <PaymentStatusFeed
                events={[event]}
                latestEvent={event}
                completionEvent={null}
                status="connected"
            />,
        );

        const listItem = screen.getByRole('listitem');
        expect(listItem.className).toMatch(/payment-flash|bg-green/);

        // Advance past the 1800 ms highlight window
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(listItem.className).not.toMatch(/payment-flash/);
        });
    });

    it('shows the celebration banner when completionEvent is present', () => {
        const completion = makeCompletion({ totalAmount: 120, currency: 'USDC' });
        render(
            <PaymentStatusFeed
                events={[]}
                latestEvent={null}
                completionEvent={completion}
                status="connected"
            />,
        );
        expect(screen.getByText(/all settled/i)).toBeInTheDocument();
        expect(screen.getByText(/120\.00 USDC collected in full/i)).toBeInTheDocument();
    });

    it('banner is keyboard-dismissible', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const completion = makeCompletion();
        render(
            <PaymentStatusFeed
                events={[]}
                latestEvent={null}
                completionEvent={completion}
                status="connected"
            />,
        );

        const dismissBtn = screen.getByRole('button', { name: /dismiss celebration/i });
        await user.click(dismissBtn);
        expect(screen.queryByText(/all settled/i)).not.toBeInTheDocument();
    });

    it('displays connection status badge correctly', () => {
        render(
            <PaymentStatusFeed
                events={[]}
                latestEvent={null}
                completionEvent={null}
                status="connecting"
            />,
        );
        expect(screen.getByText('Connecting')).toBeInTheDocument();
    });

    it('caps events at 10 (consumer responsibility)', () => {
        // The hook caps at 10 events; the component just renders what it receives.
        const events = Array.from({ length: 10 }, (_, i) =>
            makeEvent({ txHash: `tx${i}`, payerLabel: `User ${i}` }),
        );
        render(
            <PaymentStatusFeed
                events={events}
                latestEvent={events[0]}
                completionEvent={null}
                status="connected"
            />,
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(10);
    });
});