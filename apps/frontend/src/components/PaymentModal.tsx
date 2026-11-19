import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatAmount,
  formatCurrency,
  normalizeStatus,
  parseAmount,
  statusLabel,
  type PaymentStatusValue,
} from '../lib/payment/transforms';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number | string;
  currency: string;
  status?: PaymentStatusValue | string;
  onSubmit?: (payload: PaymentSubmitPayload) => void | Promise<void>;
  onSuccess?: (payload: PaymentSubmitPayload) => void;
  onError?: (error: Error) => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export interface PaymentSubmitPayload {
  amount: number;
  currency: string;
  status: PaymentStatusValue;
}

export interface UsePaymentModalOptions {
  amount: number | string;
  currency: string;
  status?: PaymentStatusValue | string;
  onSubmit?: (payload: PaymentSubmitPayload) => void | Promise<void>;
  onSuccess?: (payload: PaymentSubmitPayload) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface UsePaymentModalResult {
  amountInput: string;
  currencyValue: string;
  statusValue: PaymentStatusValue;
  formattedAmount: string;
  formattedCurrency: string;
  statusText: string;
  error: string | null;
  isSubmitting: boolean;
  isDisabled: boolean;
  setAmountInput: (value: string) => void;
  setCurrencyValue: (value: string) => void;
  reset: () => void;
  handleSubmit: (event?: React.FormEvent) => Promise<void>;
}

const DEFAULT_CURRENCY = 'USD';

export function usePaymentModal(options: UsePaymentModalOptions): UsePaymentModalResult {
  const {
    amount,
    currency,
    status,
    onSubmit,
    onSuccess,
    onError,
    disabled = false,
    loading = false,
  } = options;

  const [amountInput, setAmountInput] = useState<string>(() => String(amount ?? ''));
  const [currencyValue, setCurrencyValue] = useState<string>(() => currency || DEFAULT_CURRENCY);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setAmountInput(String(amount ?? ''));
  }, [amount]);

  useEffect(() => {
    setCurrencyValue(currency || DEFAULT_CURRENCY);
  }, [currency]);

  const statusValue = useMemo(() => normalizeStatus(status), [status]);

  const parsedAmount = useMemo(() => parseAmount(amountInput), [amountInput]);

  const formattedAmount = useMemo(() => {
    if (parsedAmount === null) {
      return '';
    }
    return formatAmount(parsedAmount, currencyValue);
  }, [parsedAmount, currencyValue]);

  const formattedCurrency = useMemo(() => formatCurrency(currencyValue), [currencyValue]);

  const statusText = useMemo(() => statusLabel(statusValue), [statusValue]);

  const isDisabled = disabled || isSubmitting || loading;

  const reset = useCallback(() => {
    setAmountInput(String(amount ?? ''));
    setCurrencyValue(currency || DEFAULT_CURRENCY);
    setError(null);
    setIsSubmitting(false);
  }, [amount, currency]);

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      if (event) {
        event.preventDefault();
      }

      if (isDisabled) {
        return;
      }

      const parsed = parseAmount(amountInput);

      if (parsed === null || parsed <= 0) {
        setError('Please enter a valid amount.');
        return;
      }

      if (!currencyValue) {
        setError('Please select a currency.');
        return;
      }

      setError(null);
      setIsSubmitting(true);

      const payload: PaymentSubmitPayload = {
        amount: parsed,
        currency: currencyValue,
        status: statusValue,
      };

      try {
        if (onSubmit) {
          await onSubmit(payload);
        }
        if (onSuccess) {
          onSuccess(payload);
        }
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error(String(err));
        setError(normalizedError.message);
        if (onError) {
          onError(normalizedError);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [amountInput, currencyValue, isDisabled, onError, onSubmit, onSuccess, statusValue],
  );

  return {
    amountInput,
    currencyValue,
    statusValue,
    formattedAmount,
    formattedCurrency,
    statusText,
    error,
    isSubmitting,
    isDisabled,
    setAmountInput,
    setCurrencyValue,
    reset,
    handleSubmit,
  };
}

export interface PaymentSummaryProps {
  amount: number | string;
  currency: string;
  status?: PaymentStatusValue | string;
  title?: string;
  description?: string;
  className?: string;
}

export function PaymentSummary({
  amount,
  currency,
  status,
  title = 'Payment Summary',
  description,
  className,
}: PaymentSummaryProps) {
  const parsed = parseAmount(amount);
  const formattedAmount = parsed === null ? '' : formatAmount(parsed, currency);
  const formattedCurrency = formatCurrency(currency);
  const statusValue = normalizeStatus(status);

  return (
    <div className={className} data-testid="payment-summary">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      <dl>
        <dt>Amount</dt>
        <dd data-testid="payment-summary-amount">{formattedAmount}</dd>
        <dt>Currency</dt>
        <dd data-testid="payment-summary-currency">{formattedCurrency}</dd>
        <dt>Status</dt>
        <dd data-testid="payment-summary-status">{statusLabel(statusValue)}</dd>
      </dl>
    </div>
  );
}

export interface PaymentFormProps {
  amountInput: string;
  currencyValue: string;
  error?: string | null;
  isSubmitting?: boolean;
  isDisabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onSubmit: (event?: React.FormEvent) => void;
  onCancel: () => void;
  className?: string;
}

export function PaymentForm({
  amountInput,
  currencyValue,
  error,
  isSubmitting = false,
  isDisabled = false,
  submitLabel = 'Pay',
  cancelLabel = 'Cancel',
  onAmountChange,
  onCurrencyChange,
  onSubmit,
  onCancel,
  className,
}: PaymentFormProps) {
  return (
    <form className={className} data-testid="payment-form" onSubmit={onSubmit} noValidate>
      <div>
        <label htmlFor="payment-amount">Amount</label>
        <input
          id="payment-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          value={amountInput}
          disabled={isDisabled}
          onChange={(event) => onAmountChange(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="payment-currency">Currency</label>
        <input
          id="payment-currency"
          name="currency"
          type="text"
          value={currencyValue}
          disabled={isDisabled}
          onChange={(event) => onCurrencyChange(event.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" data-testid="payment-form-error">
          {error}
        </p>
      ) : null}
      <div>
        <button type="button" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </button>
        <button type="submit" disabled={isDisabled}>
          {isSubmitting ? 'Processing...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export interface PaymentStatusProps {
  status: PaymentStatusValue | string;
  error?: string | null;
  isSubmitting?: boolean;
  className?: string;
}

export function PaymentStatus({
  status,
  error,
  isSubmitting = false,
  className,
}: PaymentStatusProps) {
  const statusValue = normalizeStatus(status);

  return (
    <div className={className} data-testid="payment-status">
      {isSubmitting ? (
        <p data-testid="payment-status-submitting">Processing payment...</p>
      ) : (
        <p data-testid="payment-status-label">{statusLabel(statusValue)}</p>
      )}
      {error ? (
        <p role="alert" data-testid="payment-status-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PaymentModal({
  isOpen,
  onClose,
  amount,
  currency,
  status,
  onSubmit,
  onSuccess,
  onError,
  title,
  description,
  submitLabel,
  cancelLabel,
  disabled,
  loading,
  className,
}: PaymentModalProps) {
  const {
    amountInput,
    currencyValue,
    statusValue,
    error,
    isSubmitting,
    isDisabled,
    setAmountInput,
    setCurrencyValue,
    handleSubmit,
  } = usePaymentModal({
    amount,
    currency,
    status,
    onSubmit,
    onSuccess,
    onError,
    disabled,
    loading,
  });

  const handleCancel = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    onClose();
  }, [isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Payment'}
      data-testid="payment-modal"
    >
      <PaymentSummary
        amount={amount}
        currency={currency}
        status={statusValue}
        title={title}
        description={description}
      />
      <PaymentForm
        amountInput={amountInput}
        currencyValue={currencyValue}
        error={error}
        isSubmitting={isSubmitting}
        isDisabled={isDisabled}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        onAmountChange={setAmountInput}
        onCurrencyChange={setCurrencyValue}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
      <PaymentStatus status={statusValue} error={error} isSubmitting={isSubmitting} />
    </div>
  );
}

export default PaymentModal;