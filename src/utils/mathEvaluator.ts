/**
 * Safe Mathematical Expression Evaluator for LiquidIsland Spotlight
 * Zero-dependency math parser supporting arithmetic, powers (^), percentages,
 * and standard mathematical functions with safe sandboxed evaluation.
 */

export interface MathEvalResult {
  expression: string;
  result: number;
  formatted: string;
}

const MATH_CHAR_REGEX = /^[\d\.\+\-\*\/\^\(\)\%\s\,\^a-zA-Z]+$/;
const HAS_OPERATOR_REGEX = /[\+\-\*\/\^\%]|sqrt|sin|cos|tan|log|abs|pi/i;

/**
 * Checks if the user's input string looks like a mathematical expression.
 */
export function isMathExpression(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 2) return false;
  if (!MATH_CHAR_REGEX.test(trimmed)) return false;
  if (!HAS_OPERATOR_REGEX.test(trimmed)) return false;
  // Prevent matching pure words or commands like "dark" or "todo"
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount === 0 && !/^(pi|sqrt|sin|cos)\(/i.test(trimmed)) return false;

  return true;
}

/**
 * Evaluates a mathematical expression safely and returns the formatted result.
 */
export function evaluateMathExpression(input: string): MathEvalResult | null {
  try {
    let expr = input.trim();
    if (!isMathExpression(expr)) return null;

    // Normalize power operator: ^ -> **
    expr = expr.replace(/\^/g, '**');

    // Normalize percentage: e.g. "15% * 200" or "50%"
    expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1 / 100)');

    // Normalize functions to Math.<func>
    expr = expr
      .replace(/\bsqrt\(/gi, 'Math.sqrt(')
      .replace(/\bsin\(/gi, 'Math.sin(')
      .replace(/\bcos\(/gi, 'Math.cos(')
      .replace(/\btan\(/gi, 'Math.tan(')
      .replace(/\blog\(/gi, 'Math.log10(')
      .replace(/\bln\(/gi, 'Math.log(')
      .replace(/\babs\(/gi, 'Math.abs(')
      .replace(/\bpi\b/gi, 'Math.PI');

    // Strict validation: only allowed characters for execution
    const sanitized = expr.replace(/Math\.(sqrt|sin|cos|tan|log10|log|abs|PI)/g, '');
    if (!/^[\d\.\+\-\*\/\(\)\s,]+$/.test(sanitized)) {
      return null;
    }

    // Sandboxed evaluation using Function with no globals in scope
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function('Math', `"use strict"; return (${expr});`);
    const val = fn(Math);

    if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
      return null;
    }

    // Format output cleanly:
    // If integer or decimal with up to 4 places
    const formatted =
      Math.abs(val) >= 1e9 || (Math.abs(val) > 0 && Math.abs(val) < 1e-4)
        ? val.toExponential(4)
        : new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 4,
          }).format(val);

    return {
      expression: input.trim(),
      result: val,
      formatted: `= ${formatted}`,
    };
  } catch {
    return null;
  }
}
