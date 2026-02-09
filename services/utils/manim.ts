/**
 * Utility functions for Manim script post-processing and normalization.
 */

/**
 * Normalizes a Manim script to be "LaTeX-free" by forcing Pango-based Text 
 * components and disabling TeX-based defaults.
 * 
 * Target environments: Windows systems without a LaTeX distribution (MikTeX/TeX Live).
 */
export function normalizeToNoTex(code: string): string {
    // 1. Force NumberLine to use Text (Pango) labels instead of TeX
    // This handles multiline NumberLine(...) calls by using a regex that doesn't stop at newlines.
    // We look for NumberLine( and inject label_constructor=Text if not present.
    let processed = code.replace(/NumberLine\s*\(([^)]+)\)/gs, (match, contents) => {
        if (contents.includes("label_constructor=")) return match;
        const hasIncludeNumbers = contents.includes("include_numbers=");
        const prefix = hasIncludeNumbers ? "" : "include_numbers=True, ";
        return `NumberLine(${prefix}label_constructor=Text, ${contents})`;
    });

    // 2. Broadly replace MathTex and Tex with Text
    // Note: This is a bit "sledgehammer" but necessary for LaTeX-free environments.
    processed = processed.replace(/\bMathTex\b/g, "Text");
    processed = processed.replace(/\bTex\s*\(/g, "Text(");

    return processed;
}
