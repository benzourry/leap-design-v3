import {createTheme} from 'thememirror';
import {tags as t} from '@lezer/highlight';

export const rekaTheme = createTheme({
	variant: 'light',
	settings: {
		background: '#fff',
		foreground: '#5c6166',
		caret: '#7c3aed',
		selection: '#036dd626',
		lineHighlight: '#8a91991a',
		gutterBackground: '#f5f5f5',
		gutterForeground: '#5fa59d',
	},
	styles: [
		{
			tag: t.comment,
			color: '#787b8099',
		},
		{
			tag: t.variableName,
			color: '#346698',
		},
		{
			tag: [t.string, t.special(t.brace)],
			color: '#00850f',
		},
		{
			tag: t.number,
			color: '#0073e6',
		},
		{
			tag: t.bool,
			color: '#0080ff',
		},
		{
			tag: t.null,
			color: '#499fbc',
		},
		{
			tag: t.keyword,
			color: '#002aff',
		},
		{
			tag: t.operator,
			color: '#032568',
		},
		{
			tag: t.className,
			color: '#0091ad',
		},
		{
			tag: t.definition(t.typeName),
			color: '#3ba3ab',
		},
		{
			tag: t.typeName,
			color: '#00bdba',
		},
		{
			tag: t.angleBracket,
			color: '#800000',
		},
		{
			tag: t.tagName,
			color: '#790202',
		},
		{
			tag: t.attributeName,
			color: '#eb0000',
		},
	],
});