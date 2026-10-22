import { Marked } from "marked";
import DOMPurify from "dompurify";

const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    link({ href, text }) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

export function renderMarkdown(src: string): string {
  return DOMPurify.sanitize(md.parse(src, { async: false }) as string, { ADD_ATTR: ["target"] });
}
