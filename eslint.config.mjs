import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import compatPlugin from "eslint-plugin-compat";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COMPAT_BROWSERS = [
	"last 2 Chrome versions",
	"last 2 Edge versions",
	"last 2 Firefox versions",
	"last 2 Safari versions",
	"last 2 iOS major versions",
	"last 2 ChromeAndroid versions",
	"not op_mini all",
];

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
	...compat.extends("next/core-web-vitals", "next/typescript"),
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		plugins: {
			compat: compatPlugin,
			"jsx-a11y": jsxA11y,
			react,
		},
		settings: {
			browsers: COMPAT_BROWSERS,
			react: {
				version: "detect",
			},
		},
		rules: {
			"compat/compat": "warn",
			"jsx-a11y/anchor-is-valid": "error",
			"jsx-a11y/click-events-have-key-events": "error",
			"jsx-a11y/interactive-supports-focus": "error",
			"jsx-a11y/label-has-associated-control": [
				"error",
				{
					assert: "either",
					depth: 3,
				},
			],
			"jsx-a11y/media-has-caption": "error",
			"jsx-a11y/no-autofocus": [
				"warn",
				{
					ignoreNonDOM: true,
				},
			],
			"jsx-a11y/no-static-element-interactions": "error",
			"jsx-a11y/tabindex-no-positive": "error",
			"react/button-has-type": "error",
			"react/jsx-no-target-blank": "error",
			"react/no-danger": "warn",
		},
	},
];

export default eslintConfig;
