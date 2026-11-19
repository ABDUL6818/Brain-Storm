import React, { useCallback, useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuizAnswer {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  answers: QuizAnswer[];
  correctAnswerId?: string;
  explanation?: string;
}

export interface QuizData {
  id?: string;
  title?: string;
  questions: QuizQuestion[];
}

export interface QuizPlayerProps {
  quiz: QuizData;
  onComplete?: (result: QuizResult) => void;
  onAnswer?: (questionId: string, answerId: string) => void;
  initialQuestionIndex?: number;
  className?: string;
}

export interface QuizResult {
  quizId?: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
  answers: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Transforms utility (inlined; mirrors apps/frontend/src/lib/quiz/transforms.ts)
// ---------------------------------------------------------------------------

export function normalizeQuiz(raw: QuizData | null | undefined): QuizData {
  if (!raw || !Array.isArray(raw.questions)) {
    return { questions: [] };
  }
  return {
    id: raw.id,
    title: raw.title,
    questions: raw.questions.map((q) => ({
      ...q,
      answers: Array.isArray(q.answers) ? q.answers : [],
    })),
  };
}

export function computeScore(
  quiz: QuizData,
  answers: Record<string, string>,
): QuizResult {
  let correctCount = 0;
  for (const question of quiz.questions) {
    const selected = answers[question.id];
    if (!selected) continue;
    const correctId =
      question.correctAnswerId ??
      question.answers.find((a) => a.isCorrect)?.id;
    if (correctId && selected === correctId) {
      correctCount += 1;
    }
  }
  const totalQuestions = quiz.questions.length;
  const score = totalQuestions === 0 ? 0 : correctCount / totalQuestions;
  return {
    quizId: quiz.id,
    totalQuestions,
    correctCount,
    score,
    answers,
  };
}

export function getProgress(
  currentIndex: number,
  totalQuestions: number,
): number {
  if (totalQuestions <= 0) return 0;
  return Math.min(1, Math.max(0, (currentIndex + 1) / totalQuestions));
}

// ---------------------------------------------------------------------------
// Custom hook
// ---------------------------------------------------------------------------

export interface UseQuizPlayerOptions {
  quiz: QuizData;
  initialQuestionIndex?: number;
  onAnswer?: (questionId: string, answerId: string) => void;
  onComplete?: (result: QuizResult) => void;
}

export interface UseQuizPlayerReturn {
  quiz: QuizData;
  currentIndex: number;
  currentQuestion: QuizQuestion | undefined;
  answers: Record<string, string>;
  isComplete: boolean;
  progress: number;
  totalQuestions: number;
  result: QuizResult | null;
  selectAnswer: (answerId: string) => void;
  goNext: () => void;
  goPrevious: () => void;
  submit: () => void;
  reset: () => void;
}

export function useQuizPlayer({
  quiz: rawQuiz,
  initialQuestionIndex = 0,
  onAnswer,
  onComplete,
}: UseQuizPlayerOptions): UseQuizPlayerReturn {
  const quiz = useMemo(() => normalizeQuiz(rawQuiz), [rawQuiz]);
  const totalQuestions = quiz.questions.length;

  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(0, initialQuestionIndex), Math.max(0, totalQuestions - 1)),
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    setCurrentIndex((idx) =>
      Math.min(idx, Math.max(0, totalQuestions - 1)),
    );
  }, [totalQuestions]);

  const currentQuestion = quiz.questions[currentIndex];

  const selectAnswer = useCallback(
    (answerId: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answerId }));
      onAnswer?.(currentQuestion.id, answerId);
    },
    [currentQuestion, onAnswer],
  );

  const goNext = useCallback(() => {
    setCurrentIndex((idx) => Math.min(idx + 1, Math.max(0, totalQuestions - 1)));
  }, [totalQuestions]);

  const goPrevious = useCallback(() => {
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const submit = useCallback(() => {
    const computed = computeScore(quiz, answers);
    setResult(computed);
    setIsComplete(true);
    onComplete?.(computed);
  }, [quiz, answers, onComplete]);

  const reset = useCallback(() => {
    setAnswers({});
    setCurrentIndex(0);
    setIsComplete(false);
    setResult(null);
  }, []);

  const progress = getProgress(currentIndex, totalQuestions);

  return {
    quiz,
    currentIndex,
    currentQuestion,
    answers,
    isComplete,
    progress,
    totalQuestions,
    result,
    selectAnswer,
    goNext,
    goPrevious,
    submit,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Presentational subcomponents
// ---------------------------------------------------------------------------

export interface QuizProgressProps {
  currentIndex: number;
  totalQuestions: number;
  progress: number;
  className?: string;
}

export function QuizProgress({
  currentIndex,
  totalQuestions,
  progress,
  className,
}: QuizProgressProps) {
  const percent = Math.round(progress * 100);
  return (
    <div
      className={['quiz-progress', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label="Quiz progress"
    >
      <div className="quiz-progress__bar" style={{ width: `${percent}%` }} />
      <span className="quiz-progress__label">
        Question {Math.min(currentIndex + 1, totalQuestions)} of {totalQuestions}
      </span>
    </div>
  );
}

export interface AnswerOptionsProps {
  answers: QuizAnswer[];
  selectedAnswerId?: string;
  onSelect: (answerId: string) => void;
  disabled?: boolean;
  name?: string;
}

export function AnswerOptions({
  answers,
  selectedAnswerId,
  onSelect,
  disabled = false,
  name = 'quiz-answer',
}: AnswerOptionsProps) {
  if (!answers || answers.length === 0) {
    return <p className="answer-options__empty">No answers available.</p>;
  }
  return (
    <ul className="answer-options" role="radiogroup">
      {answers.map((answer) => {
        const checked = selectedAnswerId === answer.id;
        return (
          <li key={answer.id} className="answer-options__item">
            <label
              className={[
                'answer-options__label',
                checked ? 'answer-options__label--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={answer.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onSelect(answer.id)}
              />
              <span className="answer-options__text">{answer.text}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export interface QuestionCardProps {
  question: QuizQuestion;
  selectedAnswerId?: string;
  onSelectAnswer: (answerId: string) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  selectedAnswerId,
  onSelectAnswer,
  disabled,
}: QuestionCardProps) {
  return (
    <div className="question-card">
      <h2 className="question-card__prompt">{question.prompt}</h2>
      <AnswerOptions
        answers={question.answers}
        selectedAnswerId={selectedAnswerId}
        onSelect={onSelectAnswer}
        disabled={disabled}
        name={`quiz-answer-${question.id}`}
      />
    </div>
  );
}

export interface QuizResultsProps {
  result: QuizResult;
  quiz?: QuizData;
  onRestart?: () => void;
}

export function QuizResults({ result, quiz, onRestart }: QuizResultsProps) {
  const percent = Math.round(result.score * 100);
  return (
    <div className="quiz-results">
      <h2 className="quiz-results__title">Quiz Complete</h2>
      <p className="quiz-results__score">
        You scored {result.correctCount} out of {result.totalQuestions} ({percent}%)
      </p>
      {quiz && quiz.questions.length > 0 && (
        <ol className="quiz-results__review">
          {quiz.questions.map((question) => {
            const selected = result.answers[question.id];
            const correctId =
              question.correctAnswerId ??
              question.answers.find((a) => a.isCorrect)?.id;
            const isCorrect = !!selected && selected === correctId;
            return (
              <li
                key={question.id}
                className={[
                  'quiz-results__item',
                  isCorrect
                    ? 'quiz-results__item--correct'
                    : 'quiz-results__item--incorrect',
                ].join(' ')}
              >
                <span className="quiz-results__prompt">{question.prompt}</span>
                {question.explanation && (
                  <span className="quiz-results__explanation">
                    {question.explanation}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {onRestart && (
        <button type="button" className="quiz-results__restart" onClick={onRestart}>
          Restart Quiz
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main QuizPlayer (thin wrapper)
// ---------------------------------------------------------------------------

export default function QuizPlayer({
  quiz,
  onComplete,
  onAnswer,
  initialQuestionIndex,
  className,
}: QuizPlayerProps) {
  const {
    quiz: normalizedQuiz,
    currentIndex,
    currentQuestion,
    answers,
    isComplete,
    progress,
    totalQuestions,
    result,
    selectAnswer,
    goNext,
    goPrevious,
    submit,
    reset,
  } = useQuizPlayer({
    quiz,
    initialQuestionIndex,
    onAnswer,
    onComplete,
  });

  if (totalQuestions === 0) {
    return (
      <div className={['quiz-player', className].filter(Boolean).join(' ')}>
        <p className="quiz-player__empty">No questions available.</p>
      </div>
    );
  }

  if (isComplete && result) {
    return (
      <div className={['quiz-player', className].filter(Boolean).join(' ')}>
        <QuizResults result={result} quiz={normalizedQuiz} onRestart={reset} />
      </div>
    );
  }

  const isLastQuestion = currentIndex >= totalQuestions - 1;
  const selectedAnswerId = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <div className={['quiz-player', className].filter(Boolean).join(' ')}>
      {normalizedQuiz.title && (
        <h1 className="quiz-player__title">{normalizedQuiz.title}</h1>
      )}
      <QuizProgress
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        progress={progress}
      />
      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          selectedAnswerId={selectedAnswerId}
          onSelectAnswer={selectAnswer}
        />
      )}
      <div className="quiz-player__controls">
        <button
          type="button"
          className="quiz-player__prev"
          onClick={goPrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </button>
        {isLastQuestion ? (
          <button
            type="button"
            className="quiz-player__submit"
            onClick={submit}
            disabled={!selectedAnswerId}
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            className="quiz-player__next"
            onClick={goNext}
            disabled={!selectedAnswerId}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}