import { createLowlight, common } from 'lowlight';

/**
 * Lowlight (highlight.js) с популярными языками: js/ts, json, xml/html, css, bash, python и др.
 * common включает ~35 языков (в т.ч. json, xml, javascript, typescript, css, bash, python, sql, yaml).
 */
export const lowlight = createLowlight(common);
