import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

export default function Markdown({ content }: { content: string }) {
  const html = marked.parse(content) as string;
  return <div className="pugh-description-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
