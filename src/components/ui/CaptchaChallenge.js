import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import Input from './Input';
import Button from './Button';

/**
 * Lightweight math-based CAPTCHA challenge.
 *
 * Renders a simple arithmetic question (e.g. "What is 7 + 5?")
 * that the user must answer correctly before submitting the form.
 * No external dependency — fully self-contained.
 *
 * Props:
 *   onVerified(answer: string) — called with the correct answer string once solved
 *   className — optional wrapper class
 */
export default function CaptchaChallenge({ onVerified, className = '' }) {
  const [challenge, setChallenge] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const generateChallenge = useCallback(() => {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    switch (op) {
      case '+':
        a = Math.floor(Math.random() * 20) + 1;
        b = Math.floor(Math.random() * 20) + 1;
        answer = a + b;
        break;
      case '-':
        a = Math.floor(Math.random() * 20) + 5;
        b = Math.floor(Math.random() * a);
        answer = a - b;
        break;
      case '×':
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        answer = a * b;
        break;
      default:
        a = 2;
        b = 3;
        answer = 5;
    }

    setChallenge({ question: `${a} ${op} ${b}`, answer });
    setUserAnswer('');
    setError('');
    setVerified(false);
  }, []);

  useEffect(() => {
    generateChallenge();
  }, [generateChallenge]);

  const handleVerify = (e) => {
    e.preventDefault();
    const parsed = parseInt(userAnswer.trim(), 10);
    if (isNaN(parsed)) {
      setError('Please enter a number');
      return;
    }
    if (parsed !== challenge.answer) {
      setError('Wrong answer — try again');
      setUserAnswer('');
      return;
    }
    setVerified(true);
    setError('');
    onVerified?.(parsed.toString());
  };

  if (!challenge) return null;

  return (
    <div className={`bg-dark-elevated border-2 border-border-strong p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-text-primary">Security Check</span>
      </div>

      <AnimatePresence mode="wait">
        {verified ? (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 py-2"
          >
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Verified — you're human!</span>
          </motion.div>
        ) : (
          <motion.form
            key="challenge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleVerify}
            className="space-y-3"
          >
            <p className="text-sm text-text-secondary">
              What is <span className="font-bold text-text-primary">{challenge.question}</span> ?
            </p>

            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Your answer"
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  setError('');
                }}
                error={error}
                containerClassName="flex-1"
                autoComplete="off"
              />
              <Button type="submit" variant="primary" size="md">
                Verify
              </Button>
            </div>

            <button
              type="button"
              onClick={generateChallenge}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              New question
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
